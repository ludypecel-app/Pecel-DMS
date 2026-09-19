import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { WARUNG_TABLE, REGION_TABLE } from "@/lib/google-sheets/tables";
import { warungSchema, type WarungInput } from "../validations/warung.schema";
import type { Warung, Region } from "@/types/entities";

const repository = new SheetsRepository<Warung>(WARUNG_TABLE);
const regionRepository = new SheetsRepository<Region>(REGION_TABLE);

export const warungService = {
  async list(params?: {
    search?: string;
    status?: "active" | "inactive";
    regionId?: string;
  }): Promise<Warung[]> {
    let items = await repository.findAll();
    if (params?.status) items = items.filter((w) => w.status === params.status);
    if (params?.regionId) items = items.filter((w) => w.region_id === params.regionId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (w) => w.name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q)
      );
    }
    return items;
  },

  async getById(id: string): Promise<Warung | null> {
    return repository.findById(id);
  },

  /** Dipakai form pembuatan Pesanan (Tahap 3) untuk auto-fill wilayah dari warung. */
  async listByRegion(regionId: string): Promise<Warung[]> {
    return repository.findAll({ region_id: regionId, status: "active" } as Partial<Warung>);
  },

  async create(input: unknown): Promise<Warung> {
    const data: WarungInput = warungSchema.parse(input);
    const region = await regionRepository.findById(data.region_id);
    if (!region || region.status !== "active") {
      throw new Error("Wilayah yang dipilih tidak valid atau tidak aktif");
    }
    return repository.create(data);
  },

  async update(id: string, input: unknown): Promise<Warung> {
    const data = warungSchema.partial().parse(input) as Partial<WarungInput>;
    if (data.region_id) {
      const region = await regionRepository.findById(data.region_id);
      if (!region || region.status !== "active") {
        throw new Error("Wilayah yang dipilih tidak valid atau tidak aktif");
      }
    }
    return repository.update(id, data);
  },

  async deactivate(id: string): Promise<void> {
    return repository.softDelete(id);
  },
};
