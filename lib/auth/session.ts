import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

/** Session user saat ini, atau null jika belum login. Dipakai API routes & layout. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Sama seperti getCurrentUser, tapi melempar error jika belum login — untuk API routes yang wajib auth. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Wajib login DAN berperan admin — dipakai API routes khusus admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN: hanya admin yang diizinkan");
  return user;
}
