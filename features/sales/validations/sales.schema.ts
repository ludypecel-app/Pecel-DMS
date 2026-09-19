import { z } from "zod";

export const salesSchema = z.object({
  // Sebenarnya opsional (label form juga bilang begitu) — relasi utama
  // login <-> data Sales dipegang oleh User.sales_id (lihat
  // features/users/services/user.service.ts), bukan Sales.user_id, yang
  // sudah dicek tidak dipakai di mana pun lagi. Field ini dulu diwajibkan
  // (.min(1)) padahal labelnya "opsional" — akibatnya Tambah Sales SELALU
  // gagal disimpan kecuali admin kebetulan mengisi ID User mentah secara
  // manual, sesuatu yang tidak ada cara mudah untuk diketahui dari UI.
  user_id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama sales wajib diisi").max(100),
  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 digit")
    .regex(/^[0-9+\-\s]+$/, "Format nomor telepon tidak valid"),
  assigned_region_id: z.string().trim().min(1, "Wilayah kerja wajib dipilih"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type SalesInput = z.infer<typeof salesSchema>;
