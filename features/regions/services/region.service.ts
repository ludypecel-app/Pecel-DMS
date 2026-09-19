import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { REGION_TABLE } from "@/lib/google-sheets/tables";
import { regionSchema, type RegionInput } from "../validations/region.schema";
import type { Region } from "@/types/entities";

const repository = new SheetsRepository<Region>(REGION_TABLE);

export const regionService = {
  async list(params?: { search?: string; status?: "active" | "inactive" }): Promise<Region[]> {
    let items = await repository.findAll();
    if (params?.status) {
      items = items.filter((r) => r.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      );
    }
    return items;
  },

  async getById(id: string): Promise<Region | null> {
    return repository.findById(id);
  },

  async create(input: unknown): Promise<Region> {
    const data: RegionInput = regionSchema.parse(input);
    const existing = await repository.findAll({ code: data.code } as Partial<Region>);
    if (existing.length > 0) {
      throw new Error(`Kode wilayah "${data.code}" sudah digunakan`);
    }
    return repository.create(data);
  },

  async update(id: string, input: unknown): Promise<Region> {
    const data: RegionInput = regionSchema.partial().parse(input) as RegionInput;
    return repository.update(id, data);
  },

  async deactivate(id: string): Promise<void> {
    // Wilayah tidak dihapus fisik — hanya dinonaktifkan (soft delete).
    // TODO Tahap 3+: sebelum nonaktif, cek relasi ke Warung aktif di wilayah ini
    // dan tolak/beri peringatan bila masih ada, sesuai aturan bisnis yang disepakati.
    return repository.softDelete(id);
  },
};
