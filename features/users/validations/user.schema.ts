import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(100),
    email: z.string().trim().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    role: z.enum(["admin", "sales"]),
    sales_id: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .refine((data) => data.role !== "sales" || !!data.sales_id, {
    message: "User dengan role Sales wajib dihubungkan ke data Sales",
    path: ["sales_id"],
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(), // reset password — kosongkan jika tidak diubah
  role: z.enum(["admin", "sales"]).optional(),
  sales_id: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
