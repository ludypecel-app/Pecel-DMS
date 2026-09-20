import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  Kanban,
  MapPin,
  Users,
  Store,
  Package,
  Settings,
  ShieldCheck,
  FileBarChart,
} from "lucide-react";

export type UserRole = "admin" | "sales";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  permission?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// Sumber tunggal untuk sidebar & mobile nav. Menambah menu baru cukup
// menambah entri di sini — tidak perlu menyentuh komponen UI.
export const navigation: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales"] },
      { label: "Pesanan", href: "/orders", icon: ClipboardList, roles: ["admin"], permission: "orders.view" },
      { label: "Penugasan", href: "/assignments", icon: Kanban, roles: ["admin", "sales"], permission: "assignments.view" },
      { label: "Laporan", href: "/reports", icon: FileBarChart, roles: ["admin"], permission: "payments.view" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Wilayah", href: "/master-data/regions", icon: MapPin, roles: ["admin"], permission: "master_data.manage" },
      { label: "Sales", href: "/master-data/sales", icon: Users, roles: ["admin"], permission: "master_data.manage" },
      { label: "Warung", href: "/master-data/warungs", icon: Store, roles: ["admin"], permission: "master_data.manage" },
      { label: "Produk", href: "/master-data/products", icon: Package, roles: ["admin"], permission: "master_data.manage" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { label: "Pengguna", href: "/settings/users", icon: Settings, roles: ["admin"], permission: "users.manage" },
      { label: "Hak Akses", href: "/settings/permissions", icon: ShieldCheck, roles: ["admin"], permission: "permissions.manage" },
    ],
  },
];
