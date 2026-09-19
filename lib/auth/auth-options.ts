import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { userService } from "@/features/users/services/user.service";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        console.log("[DEBUG] Mencoba login dengan email:", JSON.stringify(credentials.email));
console.log("[DEBUG] Password diterima - panjang:", credentials.password.length, "isi:", JSON.stringify(credentials.password));

        try {
          const user = await userService.getByEmailWithHash(credentials.email);
          console.log("[DEBUG] Hasil pencarian user:", user ? JSON.stringify({ id: user.id, email: user.email, status: user.status, role: user.role, fullHash: user.password_hash }) : "TIDAK DITEMUKAN");

          if (!user || user.status !== "active") return null;

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          console.log("[DEBUG] Hasil bcrypt.compare:", valid);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            salesId: user.sales_id,
          };
        } catch (err) {
          console.log("[DEBUG] ERROR saat proses login:", err instanceof Error ? err.stack ?? err.message : String(err));
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: "admin" | "sales" }).role;
        token.salesId = (user as unknown as { salesId?: string }).salesId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "admin" | "sales";
        session.user.salesId = token.salesId as string | undefined;
      }
      return session;
    },
  },
};