import { describe, it, expect } from "vitest";
import { createOrderSchema, updateOrderSchema, cancelOrderSchema } from "@/features/orders/validations/order.schema";

describe("createOrderSchema", () => {
  it("menerima input valid dengan minimal satu produk", () => {
    const result = createOrderSchema.safeParse({
      warung_id: "w1",
      delivery_date: "2026-09-20",
      items: [{ product_id: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(true);
  });

  it("menolak pesanan tanpa produk", () => {
    const result = createOrderSchema.safeParse({
      warung_id: "w1",
      delivery_date: "2026-09-20",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("menolak quantity nol atau negatif", () => {
    const result = createOrderSchema.safeParse({
      warung_id: "w1",
      delivery_date: "2026-09-20",
      items: [{ product_id: "p1", quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("menolak jika warung_id kosong", () => {
    const result = createOrderSchema.safeParse({
      warung_id: "",
      delivery_date: "2026-09-20",
      items: [{ product_id: "p1", quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateOrderSchema", () => {
  it("semua field opsional — objek kosong tetap valid", () => {
    const result = updateOrderSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("cancelOrderSchema", () => {
  it("menolak alasan kosong", () => {
    const result = cancelOrderSchema.safeParse({ reason: "" });
    expect(result.success).toBe(false);
  });

  it("menerima alasan yang diisi", () => {
    const result = cancelOrderSchema.safeParse({ reason: "Warung tutup permanen" });
    expect(result.success).toBe(true);
  });
});
