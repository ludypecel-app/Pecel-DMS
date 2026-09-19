import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { REGION_TABLE, WARUNG_TABLE, SALES_TABLE, ORDER_TABLE } from "@/lib/google-sheets/tables";
import { regionSchema, type RegionInput } from "../validations/region.schema";
import type { Region, Warung, Sales, Order } from "@/types/entities";

const repository = new SheetsRepository<Region>(REGION_TABLE);
const warungRepository = new SheetsRepository<Warung>(WARUNG_TABLE);
const salesRepository = new SheetsRepository<Sales>(SALES_TABLE);
const orderRepository = new SheetsRepository<Order>(ORDER_TABLE);

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
    // Wilayah tidak dihapus fisik lewat aksi Nonaktifkan — hanya status
    // diubah jadi inactive (soft delete), supaya Warung/Sales/Pesanan lama
    // yang masih merujuk wilayah ini via id tetap utuh datanya.
    return repository.softDelete(id);
  },

  /**
   * Hapus permanen (hard delete) — hanya boleh kalau wilayah ini sudah
   * tidak dirujuk oleh data lain sama sekali (Warung, Sales, atau Pesanan,
   * aktif maupun tidak). Kalau masih ada yang merujuk, baris-baris itu akan
   * jadi "yatim" (region_id/assigned_region_id menunjuk ke wilayah yang
   * tidak ada) begitu dihapus, jadi permintaan ditolak dengan pesan jelas —
   * pengguna diarahkan memakai Nonaktifkan saja.
   */
  async remove(id: string): Promise<void> {
    const region = await repository.findById(id);
    if (!region) throw new Error("Wilayah tidak ditemukan");

    const [warungs, salesList, orders] = await Promise.all([
      warungRepository.findAll({ region_id: id } as Partial<Warung>),
      salesRepository.findAll({ assigned_region_id: id } as Partial<Sales>),
      orderRepository.findAll({ region_id: id } as Partial<Order>),
    ]);

    if (warungs.length > 0 || salesList.length > 0 || orders.length > 0) {
      throw new Error(
        `Wilayah "${region.name}" masih dipakai oleh data Warung, Sales, dan/atau Pesanan lain — tidak bisa dihapus permanen. Gunakan Nonaktifkan agar riwayat data lain tetap aman.`
      );
    }

    return repository.remove(id);
  },
};
