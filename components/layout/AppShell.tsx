import { Sidebar } from "./Sidebar";
import { Rail } from "./Rail";
import { BottomTabs } from "./BottomTabs";
import { Header } from "./Header";
import type { UserRole } from "@/config/navigation";

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

// Layout responsif 3 mode mengikuti hasil redesain "Pulsar":
// - Desktop (lg+): sidebar penuh di kiri (avatar & keluar di footer sidebar).
// - Tablet (md–lg): rail ikon di kiri (avatar & keluar via topbar).
// - Mobile (<md): bottom tab bar 4 menu utama + hamburger topbar untuk
//   menu lainnya, avatar & keluar via topbar.
export function AppShell({ role, userName, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <Sidebar role={role} userName={userName} className="hidden lg:flex lg:w-64 lg:shrink-0" />
      <Rail role={role} className="hidden md:flex lg:hidden" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header role={role} userName={userName} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>

      <BottomTabs role={role} className="md:hidden" />
    </div>
  );
}
