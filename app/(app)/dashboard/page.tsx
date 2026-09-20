"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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
import { ButtonLink } from "@/components/ui/Button";
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

  const fetchDashboard = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    fetch("/api/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal memuat dashboard");
        setRole(json.role);
        if (json.role === "admin") setAdminData(json.data);
        else setSalesData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (!opts?.silent) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Ringkasan angka-angka ikut terupdate otomatis mengikuti aksi yang
  // terjadi di halaman lain (pesanan baru, penugasan, kunjungan, dst.).
  useAutoRefresh(() => fetchDashboard({ silent: true }), 15000);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  if (isLoading) return <p className="text-sm text-ink-muted">Memuat dashboard...</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1 !text-[20px]">Dashboard</h1>
        <p className="text-sm text-ink-muted">
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

          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="mb-1 text-sm font-semibold text-ink">Ringkasan Penjualan Hari Ini</h2>
            <p className="text-2xl font-semibold text-forest-700">{formatPrice(adminData.salesSummaryToday)}</p>
            <p className="text-xs text-ink-muted">Total dari seluruh pembayaran yang tercatat hari ini</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">Ringkasan Stok di Lapangan</h2>
            <p className="mb-3 text-xs text-ink-muted">Produk yang masih dibawa sales (belum terjual/ditarik/selesai)</p>
            {adminData.stockSummary.length === 0 ? (
              <p className="text-sm text-ink-muted">Tidak ada stok yang sedang beredar.</p>
            ) : (
              <div className="space-y-1.5">
                {adminData.stockSummary.map((s) => (
                  <div key={s.productId} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{s.productName}</span>
                    <span className="font-medium text-ink">{s.outstanding}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="mb-1 text-sm font-semibold text-ink">Performa Sales</h2>
              <p className="mb-3 text-xs text-ink-muted">Top 5 berdasarkan nilai pesanan yang ditangani</p>
              {adminData.salesPerformance.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada data.</p>
              ) : (
                <div className="space-y-3">
                  {adminData.salesPerformance.map((s) => (
                    <div key={s.salesId} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">{s.salesName}</span>
                        <span className="text-ink-muted">{formatPrice(s.totalOmzet)}</span>
                      </div>
                      <p className="text-xs text-ink-muted">
                        {s.completedAssignments}/{s.totalAssignments} tugas selesai ({s.completionRate}%)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="mb-1 text-sm font-semibold text-ink">Performa Wilayah</h2>
              <p className="mb-3 text-xs text-ink-muted">Top 5 berdasarkan nilai pesanan</p>
              {adminData.regionPerformance.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada data.</p>
              ) : (
                <div className="space-y-2">
                  {adminData.regionPerformance.map((r) => (
                    <div key={r.regionId} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{r.regionName}</span>
                      <div className="text-right">
                        <p className="font-medium text-ink">{formatPrice(r.totalOmzet)}</p>
                        <p className="text-xs text-ink-muted">{r.totalOrders} pesanan</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <ButtonLink variant="tertiary" tone="brand" inline href="/reports" className="mt-3 !text-xs">
                Lihat laporan per wilayah →
              </ButtonLink>
            </div>

            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="mb-1 text-sm font-semibold text-ink">Performa Warung</h2>
              <p className="mb-3 text-xs text-ink-muted">Top 5 berdasarkan nilai pesanan</p>
              {adminData.warungPerformance.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada data.</p>
              ) : (
                <div className="space-y-2">
                  {adminData.warungPerformance.map((w) => (
                    <div key={w.warungId} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{w.warungName}</span>
                      <div className="text-right">
                        <p className="font-medium text-ink">{formatPrice(w.totalOmzet)}</p>
                        <p className="text-xs text-ink-muted">{w.totalOrders} pesanan</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ButtonLink variant="tertiary" tone="brand" inline href="/assignments/kanban">
            Lihat Kanban Penugasan →
          </ButtonLink>
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
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink">Jadwal Picking</h2>
              {salesData.pickingSchedule.length === 0 ? (
                <p className="text-sm text-ink-muted">Tidak ada jadwal picking.</p>
              ) : (
                <div className="space-y-1.5">
                  {salesData.pickingSchedule.map((p) => (
                    <div key={p.assignmentId} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{p.orderNumber}</span>
                      <span className="text-ink-muted">{p.pickingDate} {p.pickingTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink">Jadwal Pengiriman</h2>
              {salesData.deliverySchedule.length === 0 ? (
                <p className="text-sm text-ink-muted">Tidak ada jadwal pengiriman.</p>
              ) : (
                <div className="space-y-1.5">
                  {salesData.deliverySchedule.map((d) => (
                    <div key={d.assignmentId} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{d.orderNumber}</span>
                      <span className="text-ink-muted">{d.deliveryDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">Riwayat Kunjungan Terbaru</h2>
            {salesData.recentVisits.length === 0 ? (
              <p className="text-sm text-ink-muted">Belum ada riwayat kunjungan.</p>
            ) : (
              <div className="space-y-1.5">
                {salesData.recentVisits.map((v) => (
                  <div key={v.assignmentId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink">
                      <CheckCircle2 size={13} className="text-forest-600" />
                      {v.orderNumber}
                    </span>
                    <span className="text-ink-muted">{ORDER_STATUS_LABEL_SHORT[v.status] ?? v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ButtonLink variant="tertiary" tone="brand" inline href="/assignments">
            Lihat Semua Tugas Saya →
          </ButtonLink>
        </>
      )}
    </div>
  );
}
