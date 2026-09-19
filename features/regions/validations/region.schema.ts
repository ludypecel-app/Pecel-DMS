import { z } from "zod";

export const regionSchema = z.object({
  code: z.string().trim().min(1, "Kode wilayah wajib diisi").max(20),
  name: z.string().trim().min(1, "Nama wilayah wajib diisi").max(100),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type RegionInput = z.infer<typeof regionSchema>;
