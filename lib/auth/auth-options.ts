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

        const user = await userService.getByEmailWithHash(credentials.email);
        if (!user || user.status !== "active") return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          salesId: user.sales_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Baru saja login — data dari authorize() sudah pasti akun aktif.
        token.role = (user as unknown as { role: "admin" | "sales" }).role;
        token.salesId = (user as unknown as { salesId?: string }).salesId;
      } else if (token.sub) {
        // Request selanjutnya (bukan saat sign-in): cek ulang status akun
        // ke Google Sheets setiap kali sesi dibaca di server (getServerSession
        // dipanggil dari requireUser/requireAdmin di tiap API route). Tanpa
        // ini, admin yang menonaktifkan seorang user tidak benar-benar
        // mencegah user itu terus memakai API — token JWT lama tetap sah
        // sampai masa berlakunya habis (berminggu-minggu) walau akunnya
        // sudah dinonaktifkan. Biaya tambahan: satu pembacaan sheet User
        // per pengecekan sesi, diringankan oleh cache 15 detik di
        // SheetsRepository.
        const current = await userService.getById(token.sub);
        if (!current || current.status !== "active") {
          token.role = undefined;
          token.salesId = undefined;
        } else {
          token.role = current.role;
          token.salesId = current.sales_id;
        }
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
