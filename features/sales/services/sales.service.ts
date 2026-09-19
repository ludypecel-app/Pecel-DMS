import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { SALES_TABLE, REGION_TABLE } from "@/lib/google-sheets/tables";
import { salesSchema, type SalesInput } from "../validations/sales.schema";
import type { Sales, Region } from "@/types/entities";

const repository = new SheetsRepository<Sales>(SALES_TABLE);
const regionRepository = new SheetsRepository<Region>(REGION_TABLE);

export const salesService = {
  async list(params?: {
    search?: string;
    status?: "active" | "inactive";
    regionId?: string;
  }): Promise<Sales[]> {
    let items = await repository.findAll();
    if (params?.status) items = items.filter((s) => s.status === params.status);
    if (params?.regionId) items = items.filter((s) => s.assigned_region_id === params.regionId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (s) => s.name.toLowerCase().includes(q) || s.phone.includes(q)
      );
    }
    return items;
  },

  async getById(id: string): Promise<Sales | null> {
    return repository.findById(id);
  },

  async create(input: unknown): Promise<Sales> {
    const data: SalesInput = salesSchema.parse(input);
    const region = await regionRepository.findById(data.assigned_region_id);
    if (!region || region.status !== "active") {
      throw new Error("Wilayah yang dipilih tidak valid atau tidak aktif");
    }
    return repository.create(data);
  },

  async update(id: string, input: unknown): Promise<Sales> {
    const data = salesSchema.partial().parse(input) as Partial<SalesInput>;
    if (data.assigned_region_id) {
      const region = await regionRepository.findById(data.assigned_region_id);
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
