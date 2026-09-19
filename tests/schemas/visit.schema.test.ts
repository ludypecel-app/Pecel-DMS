import { describe, it, expect } from "vitest";
import { checkOutSchema } from "@/features/visits/validations/visit.schema";

describe("checkOutSchema", () => {
  const basePayment = { status: "lunas" as const, method: "tunai" as const };

  it("menerima input lengkap yang valid", () => {
    const result = checkOutSchema.safeParse({
      items: [{ product_id: "p1", sold_quantity: 8, returned_quantity: 2 }],
      payment: basePayment,
    });
    expect(result.success).toBe(true);
  });

  it("menolak jika items kosong", () => {
    const result = checkOutSchema.safeParse({ items: [], payment: basePayment });
    expect(result.success).toBe(false);
  });

  it("menolak sold_quantity negatif", () => {
    const result = checkOutSchema.safeParse({
      items: [{ product_id: "p1", sold_quantity: -1, returned_quantity: 0 }],
      payment: basePayment,
    });
    expect(result.success).toBe(false);
  });

  it("menolak status pembayaran di luar enum", () => {
    const result = checkOutSchema.safeParse({
      items: [{ product_id: "p1", sold_quantity: 1, returned_quantity: 0 }],
      payment: { status: "belum_transfer", method: "tunai" },
    });
    expect(result.success).toBe(false);
  });

  it("proof_url opsional — boleh tidak diisi", () => {
    const result = checkOutSchema.safeParse({
      items: [{ product_id: "p1", sold_quantity: 1, returned_quantity: 0 }],
      payment: basePayment,
    });
    expect(result.success).toBe(true);
  });
});
