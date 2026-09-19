"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  UserCheck,
  Truck,
  Users,
  MapPin,
  CreditCard,
  AlertTriangle,
  Package,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import type { AdminDashboardData, SalesDashboardData } from "@/features/dashboard/types/dashboard.types";

const ORDER_STATUS_LABEL_SHORT: Record<string, string> = {
  visited: "Visited",
  completed: "Completed",
};

export default function DashboardPage() {
  const [role, setRole] = useState<"admin" | "sales" | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [salesData, setSalesData] = useState<SalesDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal memuat dashboard");
        setRole(json.role);
        if (json.role === "admin") setAdminData(json.data);
        else setSalesData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  if (isLoading) return <p className="text-sm text-neutral-500">Memuat dashboard...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          {role === "admin" ? "Ringkasan operasional hari ini" : "Ringkasan tugas Anda"}
        </p>
      </div>

      {role === "admin" && adminData && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Pesanan Hari Ini" value={adminData.totalOrdersToday} icon={ClipboardList} />
            <StatCard label="Scheduling" value={adminData.ordersScheduling} icon={ClipboardList} />
            <StatCard label="Assigned" value={adminData.ordersAssigned} icon={UserCheck} />
            <StatCard label="Dalam Pengiriman" value={adminData.ordersInDelivery} icon={Truck} />
            <StatCard label="Sales Aktif Hari Ini" value={adminData.activeSalesToday} icon={Users} />
            <StatCard label="Kunjungan Hari Ini" value={adminData.visitsToday} icon={MapPin} />
            <StatCard label="Pembayaran Belum Lunas" value={adminData.unpaidPayments} icon={CreditCard} tone="warning" />
            <StatCard label="Pesanan Terlambat" value={adminData.lateOrders} icon={AlertTriangle} tone={adminData.lateOrders > 0 ? "danger" : "default"} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">Ringkasan Penjualan Hari Ini</h2>
            <p className="text-2xl font-semibold text-forest-700">{formatPrice(adminData.salesSummaryToday)}</p>
            <p className="text-xs text-neutral-400">Total dari seluruh pembayaran yang tercatat hari ini</p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">Ringkasan Stok di Lapangan</h2>
            <p className="mb-3 text-xs text-neutral-400">Produk yang masih dibawa sales (belum terjual/ditarik/selesai)</p>
            {adminData.stockSummary.length === 0 ? (
              <p className="text-sm text-neutral-400">Tidak ada stok yang sedang beredar.</p>
            ) : (
              <div className="space-y-1.5">
                {adminData.stockSummary.map((s) => (
                  <div key={s.productId} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{s.productName}</span>
                    <span className="font-medium text-neutral-900">{s.outstanding}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/assignments/kanban" className="inline-block text-sm font-medium text-forest-700 hover:underline">
            Lihat Kanban Penugasan →
          </Link>
        </>
      )}

      {role === "sales" && salesData && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Tugas Hari Ini" value={salesData.tasksToday} icon={CalendarClock} />
            <StatCard label="Perlu Diterima" value={salesData.tasksToAccept} icon={UserCheck} tone={salesData.tasksToAccept > 0 ? "warning" : "default"} />
            <StatCard label="Dalam Perjalanan" value={salesData.inDelivery} icon={Truck} />
            <StatCard label="Kunjungan Belum Selesai" value={salesData.unfinishedVisits} icon={MapPin} tone={salesData.unfinishedVisits > 0 ? "warning" : "default"} />
            <StatCard label="Penjualan Minggu Ini" value={formatPrice(salesData.salesSummaryThisWeek)} icon={Package} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">Jadwal Picking</h2>
              {salesData.pickingSchedule.length === 0 ? (
                <p className="text-sm text-neutral-400">Tidak ada jadwal picking.</p>
              ) : (
                <div className="space-y-1.5">
                  {salesData.pickingSchedule.map((p) => (
                    <div key={p.assignmentId} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700">{p.orderNumber}</span>
                      <span className="text-neutral-500">{p.pickingDate} {p.pickingTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">Jadwal Pengiriman</h2>
              {salesData.deliverySchedule.length === 0 ? (
                <p className="text-sm text-neutral-400">Tidak ada jadwal pengiriman.</p>
              ) : (
                <div className="space-y-1.5">
                  {salesData.deliverySchedule.map((d) => (
                    <div key={d.assignmentId} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700">{d.orderNumber}</span>
                      <span className="text-neutral-500">{d.deliveryDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">Riwayat Kunjungan Terbaru</h2>
            {salesData.recentVisits.length === 0 ? (
              <p className="text-sm text-neutral-400">Belum ada riwayat kunjungan.</p>
            ) : (
              <div className="space-y-1.5">
                {salesData.recentVisits.map((v) => (
                  <div key={v.assignmentId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-neutral-700">
                      <CheckCircle2 size={13} className="text-forest-600" />
                      {v.orderNumber}
                    </span>
                    <span className="text-neutral-500">{ORDER_STATUS_LABEL_SHORT[v.status] ?? v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/assignments" className="inline-block text-sm font-medium text-forest-700 hover:underline">
            Lihat Semua Tugas Saya →
          </Link>
        </>
      )}
    </div>
  );
}
