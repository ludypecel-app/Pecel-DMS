import { describe, it, expect } from "vitest";
import { generateId, generateSequentialId } from "@/lib/utils/id";

describe("generateId", () => {
  it("menghasilkan UUID unik setiap dipanggil", () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("generateSequentialId", () => {
  it("menghasilkan format PREFIX-YYYYMMDD-NNNN", () => {
    const id = generateSequentialId("ORD", 1);
    expect(id).toMatch(/^ORD-\d{8}-0001$/);
  });

  it("mem-pad sequence ke 4 digit", () => {
    const id = generateSequentialId("ORD", 42);
    expect(id.endsWith("-0042")).toBe(true);
  });

  it("tidak memotong sequence yang sudah lebih dari 4 digit", () => {
    const id = generateSequentialId("ORD", 12345);
    expect(id.endsWith("-12345")).toBe(true);
  });
});
