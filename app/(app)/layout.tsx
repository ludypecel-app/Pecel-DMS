import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Lapisan pertahanan kedua selain middleware.ts — middleware sudah
  // menolak request tanpa sesi, ini jaga-jaga bila middleware dilewati.
  if (!user) redirect("/login");

  return (
    <AppShell role={user.role} userName={user.name ?? user.email ?? "User"}>
      {children}
    </AppShell>
  );
}
