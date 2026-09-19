import { randomUUID } from "crypto";

/** ID generik untuk entitas apa pun (mis. Region, Warung, Payment). */
export function generateId(): string {
  return randomUUID();
}

/**
 * ID berformat manusiawi untuk entitas transaksional, mis. ORD-20260915-0001.
 * `sequence` sebaiknya dihitung di Service Layer (bukan row number sheet) —
 * misalnya dari counter tersendiri atau panjang hasil query hari itu + 1.
 */
export function generateSequentialId(prefix: string, sequence: number): string {
  const today = new Date();
  const datePart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${datePart}-${String(sequence).padStart(4, "0")}`;
}
