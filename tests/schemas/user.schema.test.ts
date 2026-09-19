import { describe, it, expect } from "vitest";
import { createUserSchema } from "@/features/users/validations/user.schema";

describe("createUserSchema", () => {
  it("menerima admin tanpa sales_id", () => {
    const result = createUserSchema.safeParse({
      name: "Admin Satu",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("menolak role sales tanpa sales_id (aturan Bagian 16.1 brief)", () => {
    const result = createUserSchema.safeParse({
      name: "Sales Satu",
      email: "sales@example.com",
      password: "password123",
      role: "sales",
    });
    expect(result.success).toBe(false);
  });

  it("menerima role sales dengan sales_id", () => {
    const result = createUserSchema.safeParse({
      name: "Sales Satu",
      email: "sales@example.com",
      password: "password123",
      role: "sales",
      sales_id: "sales-uuid",
    });
    expect(result.success).toBe(true);
  });

  it("menolak password kurang dari 8 karakter", () => {
    const result = createUserSchema.safeParse({
      name: "Admin",
      email: "admin@example.com",
      password: "short",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("menolak format email tidak valid", () => {
    const result = createUserSchema.safeParse({
      name: "Admin",
      email: "bukan-email",
      password: "password123",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});
