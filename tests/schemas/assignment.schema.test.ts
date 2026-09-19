import { describe, it, expect } from "vitest";
import {
  createAssignmentSchema,
  rejectAssignmentSchema,
  confirmPickingSchema,
  cancelAssignmentSchema,
} from "@/features/assignments/validations/assignment.schema";

describe("createAssignmentSchema", () => {
  it("menerima input lengkap", () => {
    const result = createAssignmentSchema.safeParse({
      order_id: "o1",
      sales_id: "s1",
      picking_date: "2026-09-20",
      picking_time: "08:00",
      delivery_date: "2026-09-20",
    });
    expect(result.success).toBe(true);
  });

  it("menolak jika sales_id kosong", () => {
    const result = createAssignmentSchema.safeParse({
      order_id: "o1",
      sales_id: "",
      picking_date: "2026-09-20",
      picking_time: "08:00",
      delivery_date: "2026-09-20",
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectAssignmentSchema & cancelAssignmentSchema", () => {
  it("keduanya menolak alasan kosong", () => {
    expect(rejectAssignmentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(cancelAssignmentSchema.safeParse({ reason: "" }).success).toBe(false);
  });
});

describe("confirmPickingSchema", () => {
  it("menolak jumlah aktual negatif", () => {
    const result = confirmPickingSchema.safeParse({
      items: [{ product_id: "p1", actual_quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("menerima jumlah aktual nol (produk habis/tidak tersedia saat picking)", () => {
    const result = confirmPickingSchema.safeParse({
      items: [{ product_id: "p1", actual_quantity: 0 }],
    });
    expect(result.success).toBe(true);
  });
});
