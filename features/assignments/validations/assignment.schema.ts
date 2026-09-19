import { z } from "zod";

export const createAssignmentSchema = z.object({
  order_id: z.string().min(1, "Pesanan wajib dipilih"),
  sales_id: z.string().min(1, "Sales wajib dipilih"),
  picking_date: z.string().min(1, "Tanggal picking wajib diisi"),
  picking_time: z.string().min(1, "Waktu picking wajib diisi"),
  delivery_date: z.string().min(1, "Tanggal pengiriman wajib diisi"),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const rejectAssignmentSchema = z.object({
  reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

export const confirmPickingSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        actual_quantity: z.number().int().min(0, "Jumlah aktual tidak boleh negatif"),
      })
    )
    .min(1, "Minimal satu produk harus dikonfirmasi"),
});
export type ConfirmPickingInput = z.infer<typeof confirmPickingSchema>;

export const cancelAssignmentSchema = z.object({
  reason: z.string().trim().min(1, "Alasan pembatalan wajib diisi"),
});

export const checkInSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
