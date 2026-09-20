import { z } from "zod";

export const warungSchema = z.object({
  name: z.string().trim().min(1, "Nama warung wajib diisi").max(150),
  region_id: z.string().trim().min(1, "Wilayah wajib dipilih"),
  address: z.string().trim().min(1, "Alamat wajib diisi").max(300),
  phone: z.string().trim().min(1, "Nomor telepon wajib diisi").max(20),
  latitude: z.number({ required_error: "Latitude wajib diisi", invalid_type_error: "Latitude wajib diisi" }).min(-90).max(90),
  longitude: z.number({ required_error: "Longitude wajib diisi", invalid_type_error: "Longitude wajib diisi" }).min(-180).max(180),
  payment_term: z.enum(["cash_on_delivery", "next_visit"]).default("cash_on_delivery"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type WarungInput = z.infer<typeof warungSchema>;
