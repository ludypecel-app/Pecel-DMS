import "server-only";
import bcrypt from "bcryptjs";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { USER_TABLE, SALES_TABLE } from "@/lib/google-sheets/tables";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "../validations/user.schema";
import type { User, Sales } from "@/types/entities";

const repository = new SheetsRepository<User>(USER_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);

function omitPasswordHash(user: User): Omit<User, "password_hash"> {
  const { password_hash, ...rest } = user;
  void password_hash;
  return rest;
}

export const userService = {
  async list(): Promise<Omit<User, "password_hash">[]> {
    const items = await repository.findAll();
    return items.map(omitPasswordHash);
  },

  async getById(id: string): Promise<Omit<User, "password_hash"> | null> {
    const item = await repository.findById(id);
    return item ? omitPasswordHash(item) : null;
  },

  /** HANYA dipakai internal oleh lib/auth — mengembalikan password_hash. */
  async getByEmailWithHash(email: string): Promise<User | null> {
    const items = await repository.findAll({ email } as Partial<User>);
    return items[0] ?? null;
  },

  async create(input: unknown): Promise<Omit<User, "password_hash">> {
    const data: CreateUserInput = createUserSchema.parse(input);

    const existing = await repository.findAll({ email: data.email } as Partial<User>);
    if (existing.length > 0) throw new Error(`Email "${data.email}" sudah terdaftar`);

    if (data.role === "sales" && data.sales_id) {
      const sales = await salesRepo.findById(data.sales_id);
      if (!sales) throw new Error("Data Sales yang dihubungkan tidak ditemukan");
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    const created = await repository.create({
      name: data.name,
      email: data.email,
      password_hash,
      role: data.role,
      sales_id: data.role === "sales" ? data.sales_id : undefined,
      status: data.status,
    } as Omit<User, "id" | "created_at" | "updated_at">);

    return omitPasswordHash(created);
  },

  async update(id: string, input: unknown): Promise<Omit<User, "password_hash">> {
    const data: UpdateUserInput = updateUserSchema.parse(input);

    const patch: Partial<User> = {
      name: data.name,
      email: data.email,
      role: data.role,
      sales_id: data.sales_id,
      status: data.status,
    };
    if (data.password) {
      patch.password_hash = await bcrypt.hash(data.password, 10);
    }

    const updated = await repository.update(id, patch);
    return omitPasswordHash(updated);
  },

  async deactivate(id: string): Promise<void> {
    return repository.softDelete(id);
  },
};
