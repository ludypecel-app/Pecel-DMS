import { z } from "zod";

export const salesSchema = z.object({
  user_id: z.string().trim().min(1, "User terkait wajib dipilih"),
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
