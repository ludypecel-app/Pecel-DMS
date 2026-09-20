import { z } from "zod";

export const warungSchema = z.object({
  name: z.string().trim().min(1, "Nama warung wajib diisi").max(150),
  region_id: z.string().trim().min(1, "Wilayah wajib dipilih"),
  address: z.string().trim().min(1, "Alamat wajib diisi").max(300),
  phone: z.string().trim().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  payment_term: z.enum(["cash_on_delivery", "next_visit"]).default("cash_on_delivery"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type WarungInput = z.infer<typeof warungSchema>;
