import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { ORDER_TABLE, ORDER_DETAIL_TABLE, PRODUCT_TABLE, WARUNG_TABLE } from "@/lib/google-sheets/tables";
import { generateSequentialId } from "@/lib/utils/id";
import {
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "../validations/order.schema";
import type { Order, OrderDetail, Product, Warung, OrderStatus } from "@/types/entities";
import type { OrderWithDetails } from "../types/order.types";

const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const productRepo = new SheetsRepository<Product>(PRODUCT_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);

// Status yang TIDAK BOLEH dibatalkan lagi (setelah barang sampai di lokasi).
// "on_delivery" ditangani sebagai kasus khusus terpisah di cancel() di bawah.
const NOT_CANCELLABLE: OrderStatus[] = ["arrived", "visited", "completed", "cancelled"];

function computeSubtotal(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

async function attachDetails(order: Order): Promise<OrderWithDetails> {
  const details = await orderDetailRepo.findAll({ order_id: order.id } as Partial<OrderDetail>);
  const total = details.reduce((sum, d) => sum + d.subtotal, 0);
  return { ...order, details, total };
}

export const orderService = {
  async list(params?: {
    search?: string;
    status?: OrderStatus;
    regionId?: string;
  }): Promise<OrderWithDetails[]> {
    let items = await orderRepo.findAll();
    if (params?.status) items = items.filter((o) => o.status === params.status);
    if (params?.regionId) items = items.filter((o) => o.region_id === params.regionId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((o) => o.order_number.toLowerCase().includes(q));
    }
    // Urutkan terbaru dulu.
    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return Promise.all(items.map(attachDetails));
  },

  async getById(id: string): Promise<OrderWithDetails | null> {
    const order = await orderRepo.findById(id);
    if (!order) return null;
    return attachDetails(order);
  },

  /**
   * Membuat pesanan baru dengan status "scheduling" (belum ada sales).
   * Wilayah otomatis diambil dari data warung — tidak dipilih manual.
   */
  async create(input: unknown, createdBy: string): Promise<OrderWithDetails> {
    const data: CreateOrderInput = createOrderSchema.parse(input);

    const warung = await warungRepo.findById(data.warung_id);
    if (!warung || warung.status !== "active") {
      throw new Error("Warung yang dipilih tidak valid atau tidak aktif");
    }

    // Validasi & bekukan harga tiap produk pada saat pesanan dibuat.
    const resolvedItems = await Promise.all(
      data.items.map(async (item) => {
        const product = await productRepo.findById(item.product_id);
        if (!product || product.status !== "active") {
          throw new Error(`Produk dengan id "${item.product_id}" tidak valid atau tidak aktif`);
        }
        return {
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: computeSubtotal(item.quantity, product.price),
        };
      })
    );

    const todayOrders = await orderRepo.findAll();
    const todayCount = todayOrders.filter(
      (o) => o.order_date === new Date().toISOString().slice(0, 10)
    ).length;
    const orderNumber = generateSequentialId("ORD", todayCount + 1);

    const order = await orderRepo.create({
      order_number: orderNumber,
      warung_id: data.warung_id,
      region_id: warung.region_id, // auto-fill, bukan input manual
      order_date: new Date().toISOString().slice(0, 10),
      delivery_date: data.delivery_date,
      status: "scheduling",
      created_by: createdBy,
    } as Omit<Order, "id" | "created_at" | "updated_at">);

    const details = await Promise.all(
      resolvedItems.map((item) =>
        orderDetailRepo.create({
          order_id: order.id,
          ...item,
        } as Omit<OrderDetail, "id" | "created_at" | "updated_at">)
      )
    );

    return { ...order, details, total: details.reduce((s, d) => s + d.subtotal, 0) };
  },

  /**
   * Edit pesanan HANYA diperbolehkan selama status masih "scheduling"
   * (sebelum ditugaskan ke sales) — sesuai aturan bisnis Tahap 3.
   * Warung tidak bisa diubah lewat sini.
   */
  async update(id: string, input: unknown): Promise<OrderWithDetails> {
    const order = await orderRepo.findById(id);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.status !== "scheduling") {
      throw new Error(
        "Pesanan hanya dapat diedit selama berstatus Scheduling. Gunakan proses Penugasan untuk mengubah detail setelah pesanan ditugaskan."
      );
    }

    const data: UpdateOrderInput = updateOrderSchema.parse(input);

    if (data.delivery_date) {
      await orderRepo.update(id, { delivery_date: data.delivery_date } as Partial<Order>);
    }

    if (data.items) {
      const resolvedItems = await Promise.all(
        data.items.map(async (item) => {
          const product = await productRepo.findById(item.product_id);
          if (!product || product.status !== "active") {
            throw new Error(`Produk dengan id "${item.product_id}" tidak valid atau tidak aktif`);
          }
          return {
            product_id: product.id,
            quantity: item.quantity,
            unit_price: product.price,
            subtotal: computeSubtotal(item.quantity, product.price),
          };
        })
      );

      // Edit hanya diizinkan saat "scheduling" (belum ada picking/stok
      // bergerak), sehingga aman mengganti total daftar produk pesanan:
      // hapus detail lama, buat detail baru dari input.
      const oldDetails = await orderDetailRepo.findAll({ order_id: id } as Partial<OrderDetail>);
      await Promise.all(oldDetails.map((d) => orderDetailRepo.remove(d.id)));

      await Promise.all(
        resolvedItems.map((item) =>
          orderDetailRepo.create({
            order_id: id,
            ...item,
          } as Omit<OrderDetail, "id" | "created_at" | "updated_at">)
        )
      );
    }

    const refreshed = await orderRepo.findById(id);
    return attachDetails(refreshed as Order);
  },

  /**
   * Pembatalan pesanan. Diizinkan sampai status "ready_to_delivery".
   * Untuk "on_delivery", butuh aturan retur khusus — untuk MVP diizinkan
   * juga tapi WAJIB dipanggil bersama pencatatan Stock Transaction retur
   * di Service Layer Assignment (Tahap 5), bukan di sini.
   */
  async cancel(id: string, input: unknown, cancelledBy: string): Promise<Order> {
    const order = await orderRepo.findById(id);
    if (!order) throw new Error("Pesanan tidak ditemukan");

    if (NOT_CANCELLABLE.includes(order.status)) {
      throw new Error(
        `Pesanan berstatus "${order.status}" tidak dapat dibatalkan.`
      );
    }
    if (order.status === "on_delivery") {
      throw new Error(
        "Pembatalan saat On Delivery memerlukan proses retur khusus di menu Penugasan (Tahap 5), tidak bisa dibatalkan langsung dari sini."
      );
    }

    const { reason } = cancelOrderSchema.parse(input);

    const updated = await orderRepo.update(id, {
      status: "cancelled",
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    } as Partial<Order>);

    // TODO Tahap 7: catat juga ke Audit Log terpusat (lib/audit-log) begitu
    // modul tersebut dibangun, agar seluruh perubahan status tercatat seragam.
    return updated;
  },
};
