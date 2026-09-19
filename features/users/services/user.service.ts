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

  /**
   * PENTING: hanya field yang benar-benar dikirim (bukan undefined) yang
   * dimasukkan ke `patch`. Ini mencegah bug lama: memanggil update() hanya
   * dengan { status: "active" } (misalnya dari tombol Aktifkan/Nonaktifkan)
   * dulu ikut menimpa name/email/role/sales_id menjadi kosong, karena
   * object spread ({ ...existing, ...patch }) di SheetsRepository.update()
   * tetap menimpa nilai existing kalau key-nya ada di patch walau nilainya
   * undefined.
   */
  async update(id: string, input: unknown): Promise<Omit<User, "password_hash">> {
    const data: UpdateUserInput = updateUserSchema.parse(input);

    if (data.email !== undefined) {
      // Sama seperti create(): tolak email yang sudah dipakai user lain.
      // Tanpa cek ini, dua user bisa berakhir dengan email yang sama —
      // login jadi tidak bisa diprediksi karena getByEmailWithHash() cuma
      // mengembalikan baris pertama yang cocok.
      const existing = await repository.findAll({ email: data.email } as Partial<User>);
      if (existing.some((u) => u.id !== id)) {
        throw new Error(`Email "${data.email}" sudah dipakai user lain`);
      }
    }

    const patch: Partial<User> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email;
    if (data.role !== undefined) patch.role = data.role;
    if (data.sales_id !== undefined) patch.sales_id = data.sales_id;
    if (data.status !== undefined) patch.status = data.status;
    if (data.password) {
      patch.password_hash = await bcrypt.hash(data.password, 10);
    }

    const updated = await repository.update(id, patch);
    return omitPasswordHash(updated);
  },

  async deactivate(id: string): Promise<void> {
    return repository.softDelete(id);
  },

  /**
   * Hapus permanen — dengan dua pengaman: tidak bisa menghapus akun sendiri
   * yang sedang dipakai login (`actorId`), dan tidak bisa menghapus admin
   * aktif terakhir (supaya sistem tidak pernah kehilangan akses admin sama
   * sekali). Tidak ada entitas lain yang bergantung langsung pada User.id
   * untuk fungsi apa pun (relasi Sales<->User dipegang oleh User.sales_id,
   * bukan sebaliknya), jadi tidak perlu cek referensi tambahan seperti pada
   * Wilayah/Sales/Warung/Produk.
   */
  async remove(id: string, actorId?: string): Promise<void> {
    const user = await repository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");

    if (actorId && actorId === id) {
      throw new Error("Anda tidak bisa menghapus akun Anda sendiri yang sedang login.");
    }

    if (user.role === "admin") {
      const activeAdmins = await repository.findAll({ role: "admin", status: "active" } as Partial<User>);
      const otherActiveAdmins = activeAdmins.filter((a) => a.id !== id);
      if (otherActiveAdmins.length === 0) {
        throw new Error("Tidak bisa menghapus admin aktif terakhir — sistem harus selalu punya minimal satu admin.");
      }
    }

    return repository.remove(id);
  },
};
