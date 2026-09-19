import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { PRODUCT_TABLE } from "@/lib/google-sheets/tables";
import { productSchema, type ProductInput } from "../validations/product.schema";
import type { Product } from "@/types/entities";

const repository = new SheetsRepository<Product>(PRODUCT_TABLE);

export const productService = {
  async list(params?: { search?: string; status?: "active" | "inactive" }): Promise<Product[]> {
    let items = await repository.findAll();
    if (params?.status) items = items.filter((p) => p.status === params.status);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }
    return items;
  },

  async getById(id: string): Promise<Product | null> {
    return repository.findById(id);
  },

  async create(input: unknown): Promise<Product> {
    const data: ProductInput = productSchema.parse(input);
    const existing = await repository.findAll({ code: data.code } as Partial<Product>);
    if (existing.length > 0) {
      throw new Error(`Kode produk "${data.code}" sudah digunakan`);
    }
    return repository.create(data);
  },

  async update(id: string, input: unknown): Promise<Product> {
    // Catatan: mengubah `price` di sini tidak mengubah harga transaksi lama —
    // OrderDetail membekukan unit_price sendiri saat pesanan dibuat (Tahap 3).
    const data = productSchema.partial().parse(input) as Partial<ProductInput>;
    return repository.update(id, data);
  },

  async deactivate(id: string): Promise<void> {
    return repository.softDelete(id);
  },
};
