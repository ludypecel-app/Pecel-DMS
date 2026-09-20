"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, ChevronRight } from "lucide-react";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import { Button } from "@/components/ui/Button";
import { WARUNG_PAYMENT_TERM_LABEL } from "@/features/warungs/constants";
import type { WarungPaymentTerm } from "@/types/entities";

interface PaymentRow {
  paymentId: string;
  date: string;
  orderNumber: string;
  salesName: string;
  amount: number;
  status: string;
  method: string;
}
interface VisitRow {
  visitId: string;
  orderNumber: string;
  salesName: string;
  warungName: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: string;
}

interface RegionSummaryRow {
  regionId: string;
  regionName: string;
  warungCount: number;
  salesCount: number;
  totalOrders: number;
  totalOmzet: number;
}

interface RegionWarungRow {
  warungId: string;
  warungName: string;
  address: string;
  status: string;
  totalOrders: number;
  totalOmzet: number;
  lastOrderDate?: string;
}

interface RegionDetail {
  regionId: string;
  regionName: string;
  warungCount: number;
  salesCount: number;
  totalOrders: number;
  totalOmzet: number;
  warungs: RegionWarungRow[];
}

/** Dipakai untuk tabel "Kinerja Sales" di detail Warung. */
interface SalesPerformanceRow {
  salesId: string;
  salesName: string;
  status: string;
  totalAssignments: number;
  completedAssignments: number;
  cancelledAssignments: number;
  activeAssignments: number;
  completionRate: number;
  totalVisits: number;
  totalOmzet: number;
}

interface WarungDetail {
  warungId: string;
  warungName: string;
  address: string;
  phone?: string;
  status: string;
  paymentTerm: WarungPaymentTerm;
  regionId: string;
  regionName: string;
  totalOrders: number;
  totalOmzet: number;
  lastOrderDate?: string;
  salesPerformance: SalesPerformanceRow[];
}

interface SalesSummaryRow {
  salesId: string;
  salesName: string;
  regionId: string;
  regionName: string;
  status: string;
  totalAssignments: number;
  completedAssignments: number;
  cancelledAssignments: number;
  activeAssignments: number;
  completionRate: number;
  totalVisits: number;
  totalOmzet: number;
}

interface SalesWarungBreakdownRow {
  warungId: string;
  warungName: string;
  totalOrders: number;
  totalOmzet: number;
}

interface SalesDetail extends SalesSummaryRow {
  phone?: string;
  warungBreakdown: SalesWarungBreakdownRow[];
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
  ditangguhkan: "Ditangguhkan",
};

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const salesList = useActiveSales();
  const [tab, setTab] = useState<"payments" | "visits" | "regions" | "sales">("payments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Laporan Per Wilayah (3 level: ringkasan wilayah -> detail wilayah -> detail warung) ---
  const [regionFilter, setRegionFilter] = useState("");
  const [warungFilter, setWarungFilter] = useState("");
  const [regionSummaries, setRegionSummaries] = useState<RegionSummaryRow[]>([]);
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [warungDetail, setWarungDetail] = useState<WarungDetail | null>(null);
  const [regionLoading, setRegionLoading] = useState(true);

  // --- Laporan Per Sales (2 level: ringkasan -> detail sales) ---
  const [salesDetailId, setSalesDetailId] = useState("");
  const [salesSummaries, setSalesSummaries] = useState<SalesSummaryRow[]>([]);
  const [salesDetail, setSalesDetail] = useState<SalesDetail | null>(null);
  const [salesTabLoading, setSalesTabLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (tab === "payments") {
      const res = await fetch(`/api/reports/payments?${params.toString()}`);
      const json = await res.json();
      setPayments(json.data ?? []);
    } else if (tab === "visits") {
      if (salesFilter) params.set("salesId", salesFilter);
      const res = await fetch(`/api/reports/visits?${params.toString()}`);
      const json = await res.json();
      setVisits(json.data ?? []);
    }
    setIsLoading(false);
  }, [tab, from, to, salesFilter]);

  useEffect(() => {
    if (tab === "payments" || tab === "visits") fetchData();
  }, [tab, fetchData]);

  function selectRegion(id: string) {
    setWarungFilter("");
    setRegionFilter(id);
  }

  const fetchRegionData = useCallback(async () => {
    setRegionLoading(true);
    if (warungFilter) {
      const res = await fetch(`/api/reports/regions?warungId=${warungFilter}`);
      const json = await res.json();
      setWarungDetail(json.data ?? null);
    } else if (regionFilter) {
      const res = await fetch(`/api/reports/regions?regionId=${regionFilter}`);
      const json = await res.json();
      setRegionDetail(json.data ?? null);
      setWarungDetail(null);
    } else {
      const res = await fetch(`/api/reports/regions`);
      const json = await res.json();
      setRegionSummaries(json.data?.summaries ?? []);
      setRegionDetail(null);
      setWarungDetail(null);
    }
    setRegionLoading(false);
  }, [regionFilter, warungFilter]);

  useEffect(() => {
    if (tab === "regions") fetchRegionData();
  }, [tab, fetchRegionData]);

  const fetchSalesReport = useCallback(async () => {
    setSalesTabLoading(true);
    if (salesDetailId) {
      const res = await fetch(`/api/reports/sales?salesId=${salesDetailId}`);
      const json = await res.json();
      setSalesDetail(json.data ?? null);
    } else {
      const res = await fetch(`/api/reports/sales`);
      const json = await res.json();
      setSalesSummaries(json.data?.summaries ?? []);
      setSalesDetail(null);
    }
    setSalesTabLoading(false);
  }, [salesDetailId]);

  useEffect(() => {
    if (tab === "sales") fetchSalesReport();
  }, [tab, fetchSalesReport]);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("id-ID") : "-");

  function handleExport() {
    if (tab === "payments") {
      const csv = toCsv(
        ["Tanggal", "No. Pesanan", "Sales", "Jumlah", "Status", "Metode"],
        payments.map((p) => [formatDateTime(p.date), p.orderNumber, p.salesName, p.amount, PAYMENT_STATUS_LABEL[p.status] ?? p.status, p.method])
      );
      downloadCsv(`laporan-pembayaran-${from || "all"}-${to || "all"}.csv`, csv);
    } else {
      const csv = toCsv(
        ["No. Pesanan", "Sales", "Warung", "Check-In", "Check-Out", "Status"],
        visits.map((v) => [v.orderNumber, v.salesName, v.warungName, formatDateTime(v.checkedInAt), formatDateTime(v.checkedOutAt), v.status])
      );
      downloadCsv(`monitoring-kunjungan-${from || "all"}-${to || "all"}.csv`, csv);
    }
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Laporan</h1>
          <p className="text-sm text-ink-muted">Laporan pembayaran & monitoring kunjungan sales</p>
        </div>
        {(tab === "payments" || tab === "visits") && (
          <Button variant="tertiary" tone="neutral" size="sm" className="border border-border" onClick={handleExport}>
            <Download size={15} /> Export CSV
          </Button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`shrink-0 px-3 py-2 text-sm font-medium ${tab === "payments" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Laporan Pembayaran
        </button>
        <button
          type="button"
          onClick={() => setTab("visits")}
          className={`shrink-0 px-3 py-2 text-sm font-medium ${tab === "visits" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Monitoring Kunjungan
        </button>
        <button
          type="button"
          onClick={() => setTab("regions")}
          className={`shrink-0 px-3 py-2 text-sm font-medium ${tab === "regions" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Per Wilayah
        </button>
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={`shrink-0 px-3 py-2 text-sm font-medium ${tab === "sales" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Per Sales
        </button>
      </div>

      {(tab === "payments" || tab === "visits") && (
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
          <span className="self-center text-sm text-ink-muted">s/d</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
          {tab === "visits" && (
            <select value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
              <option value="">Semua Sales</option>
              {salesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {tab === "regions" && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => { setRegionFilter(""); setWarungFilter(""); }}
            className={regionFilter ? "text-forest-700 hover:underline" : "font-semibold text-ink"}
          >
            Semua Wilayah
          </button>
          {regionFilter && (
            <>
              <ChevronRight size={14} className="text-ink-muted" />
              <button
                type="button"
                onClick={() => setWarungFilter("")}
                className={warungFilter ? "text-forest-700 hover:underline" : "font-semibold text-ink"}
              >
                {regionDetail?.regionName ?? "..."}
              </button>
            </>
          )}
          {warungFilter && (
            <>
              <ChevronRight size={14} className="text-ink-muted" />
              <span className="font-semibold text-ink">{warungDetail?.warungName ?? "..."}</span>
            </>
          )}
        </div>
      )}

      {tab === "sales" && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setSalesDetailId("")}
            className={salesDetailId ? "text-forest-700 hover:underline" : "font-semibold text-ink"}
          >
            Semua Sales
          </button>
          {salesDetailId && (
            <>
              <ChevronRight size={14} className="text-ink-muted" />
              <span className="font-semibold text-ink">{salesDetail?.salesName ?? "..."}</span>
            </>
          )}
        </div>
      )}

      {tab === "regions" ? (
        regionLoading ? (
          <p className="text-sm text-ink-muted">Memuat...</p>
        ) : warungFilter ? (
          warungDetail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{warungDetail.warungName}</h2>
                    <p className="text-xs text-ink-muted">{warungDetail.address}</p>
                    <p className="text-xs text-ink-muted">{warungDetail.regionName}{warungDetail.phone ? ` · ${warungDetail.phone}` : ""}</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-surface-page px-2.5 py-1 text-xs font-medium text-ink">
                    {WARUNG_PAYMENT_TERM_LABEL[warungDetail.paymentTerm]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Total Pesanan</p>
                  <p className="text-lg font-semibold text-ink">{warungDetail.totalOrders}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Total Nilai</p>
                  <p className="text-lg font-semibold text-forest-700">{formatPrice(warungDetail.totalOmzet)}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Pesanan Terakhir</p>
                  <p className="text-lg font-semibold text-ink">{warungDetail.lastOrderDate ?? "-"}</p>
                </div>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-ink">Kinerja Sales di {warungDetail.warungName}</h2>
                <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface-page text-ink-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Sales</th>
                        <th className="px-4 py-2.5 font-medium">Total Tugas</th>
                        <th className="px-4 py-2.5 font-medium">Selesai</th>
                        <th className="px-4 py-2.5 font-medium">Berjalan</th>
                        <th className="px-4 py-2.5 font-medium">Dibatalkan</th>
                        <th className="px-4 py-2.5 font-medium">Tingkat Selesai</th>
                        <th className="px-4 py-2.5 font-medium">Kunjungan</th>
                        <th className="px-4 py-2.5 font-medium">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {warungDetail.salesPerformance.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-ink-muted">Belum ada sales yang menangani pesanan warung ini.</td></tr>
                      )}
                      {warungDetail.salesPerformance.map((s) => (
                        <tr key={s.salesId}>
                          <td className="px-4 py-2 font-medium text-ink">{s.salesName}</td>
                          <td className="px-4 py-2">{s.totalAssignments}</td>
                          <td className="px-4 py-2">{s.completedAssignments}</td>
                          <td className="px-4 py-2">{s.activeAssignments}</td>
                          <td className="px-4 py-2">{s.cancelledAssignments}</td>
                          <td className="px-4 py-2">{s.completionRate}%</td>
                          <td className="px-4 py-2">{s.totalVisits}</td>
                          <td className="px-4 py-2">{formatPrice(s.totalOmzet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-danger">Gagal memuat data warung.</p>
          )
        ) : !regionFilter ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-page text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Wilayah</th>
                  <th className="px-4 py-2.5 font-medium">Warung</th>
                  <th className="px-4 py-2.5 font-medium">Sales</th>
                  <th className="px-4 py-2.5 font-medium">Total Pesanan</th>
                  <th className="px-4 py-2.5 font-medium">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regionSummaries.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-muted">Belum ada data wilayah.</td></tr>
                )}
                {regionSummaries.map((r) => (
                  <tr key={r.regionId} className="cursor-pointer hover:bg-surface-page" onClick={() => selectRegion(r.regionId)}>
                    <td className="px-4 py-2 font-medium text-forest-700">{r.regionName}</td>
                    <td className="px-4 py-2">{r.warungCount}</td>
                    <td className="px-4 py-2">{r.salesCount}</td>
                    <td className="px-4 py-2">{r.totalOrders}</td>
                    <td className="px-4 py-2">{formatPrice(r.totalOmzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : regionDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface-raised p-3">
                <p className="text-xs text-ink-muted">Warung</p>
                <p className="text-lg font-semibold text-ink">{regionDetail.warungCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3">
                <p className="text-xs text-ink-muted">Sales</p>
                <p className="text-lg font-semibold text-ink">{regionDetail.salesCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3">
                <p className="text-xs text-ink-muted">Total Pesanan</p>
                <p className="text-lg font-semibold text-ink">{regionDetail.totalOrders}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3">
                <p className="text-xs text-ink-muted">Total Nilai</p>
                <p className="text-lg font-semibold text-forest-700">{formatPrice(regionDetail.totalOmzet)}</p>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Warung di {regionDetail.regionName}</h2>
              <p className="mb-2 text-xs text-ink-muted">Klik warung untuk melihat kinerja sales yang menanganinya.</p>
              <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-page text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Warung</th>
                      <th className="px-4 py-2.5 font-medium">Alamat</th>
                      <th className="px-4 py-2.5 font-medium">Pesanan</th>
                      <th className="px-4 py-2.5 font-medium">Total Nilai</th>
                      <th className="px-4 py-2.5 font-medium">Pesanan Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {regionDetail.warungs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-muted">Belum ada warung di wilayah ini.</td></tr>
                    )}
                    {regionDetail.warungs.map((w) => (
                      <tr key={w.warungId} className="cursor-pointer hover:bg-surface-page" onClick={() => setWarungFilter(w.warungId)}>
                        <td className="px-4 py-2 font-medium text-forest-700">{w.warungName}</td>
                        <td className="px-4 py-2 text-ink-muted">{w.address}</td>
                        <td className="px-4 py-2">{w.totalOrders}</td>
                        <td className="px-4 py-2">{formatPrice(w.totalOmzet)}</td>
                        <td className="px-4 py-2">{w.lastOrderDate ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-danger">Gagal memuat data wilayah.</p>
        )
      ) : tab === "sales" ? (
        salesTabLoading ? (
          <p className="text-sm text-ink-muted">Memuat...</p>
        ) : salesDetailId ? (
          salesDetail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <h2 className="text-sm font-semibold text-ink">{salesDetail.salesName}</h2>
                <p className="text-xs text-ink-muted">
                  {salesDetail.regionName}
                  {salesDetail.phone ? ` · ${salesDetail.phone}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Total Tugas</p>
                  <p className="text-lg font-semibold text-ink">{salesDetail.totalAssignments}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Tingkat Selesai</p>
                  <p className="text-lg font-semibold text-ink">{salesDetail.completionRate}%</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Kunjungan</p>
                  <p className="text-lg font-semibold text-ink">{salesDetail.totalVisits}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Total Nilai</p>
                  <p className="text-lg font-semibold text-forest-700">{formatPrice(salesDetail.totalOmzet)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Selesai</p>
                  <p className="font-semibold text-ink">{salesDetail.completedAssignments}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Berjalan</p>
                  <p className="font-semibold text-ink">{salesDetail.activeAssignments}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">Dibatalkan</p>
                  <p className="font-semibold text-ink">{salesDetail.cancelledAssignments}</p>
                </div>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-ink">Warung yang Ditangani</h2>
                <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface-page text-ink-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Warung</th>
                        <th className="px-4 py-2.5 font-medium">Pesanan</th>
                        <th className="px-4 py-2.5 font-medium">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salesDetail.warungBreakdown.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-muted">Belum ada warung yang ditangani sales ini.</td></tr>
                      )}
                      {salesDetail.warungBreakdown.map((w) => (
                        <tr key={w.warungId}>
                          <td className="px-4 py-2 font-medium text-ink">{w.warungName}</td>
                          <td className="px-4 py-2">{w.totalOrders}</td>
                          <td className="px-4 py-2">{formatPrice(w.totalOmzet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-danger">Gagal memuat data sales.</p>
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-page text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Sales</th>
                  <th className="px-4 py-2.5 font-medium">Wilayah</th>
                  <th className="px-4 py-2.5 font-medium">Total Tugas</th>
                  <th className="px-4 py-2.5 font-medium">Tingkat Selesai</th>
                  <th className="px-4 py-2.5 font-medium">Kunjungan</th>
                  <th className="px-4 py-2.5 font-medium">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesSummaries.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">Belum ada data sales.</td></tr>
                )}
                {salesSummaries.map((s) => (
                  <tr key={s.salesId} className="cursor-pointer hover:bg-surface-page" onClick={() => setSalesDetailId(s.salesId)}>
                    <td className="px-4 py-2 font-medium text-forest-700">{s.salesName}</td>
                    <td className="px-4 py-2">{s.regionName}</td>
                    <td className="px-4 py-2">{s.totalAssignments}</td>
                    <td className="px-4 py-2">{s.completionRate}%</td>
                    <td className="px-4 py-2">{s.totalVisits}</td>
                    <td className="px-4 py-2">{formatPrice(s.totalOmzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : tab === "payments" ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-surface-raised p-3">
            <p className="text-xs text-ink-muted">Total periode ini</p>
            <p className="text-lg font-semibold text-forest-700">{formatPrice(totalAmount)}</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-page text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 font-medium">No. Pesanan</th>
                  <th className="px-4 py-2.5 font-medium">Sales</th>
                  <th className="px-4 py-2.5 font-medium">Jumlah</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">Tidak ada data pada periode ini.</td></tr>
                )}
                {payments.map((p) => (
                  <tr key={p.paymentId}>
                    <td className="px-4 py-2">{formatDateTime(p.date)}</td>
                    <td className="px-4 py-2">{p.orderNumber}</td>
                    <td className="px-4 py-2">{p.salesName}</td>
                    <td className="px-4 py-2">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-2">{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</td>
                    <td className="px-4 py-2 capitalize">{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-page text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">No. Pesanan</th>
                <th className="px-4 py-2.5 font-medium">Sales</th>
                <th className="px-4 py-2.5 font-medium">Warung</th>
                <th className="px-4 py-2.5 font-medium">Check-In</th>
                <th className="px-4 py-2.5 font-medium">Check-Out</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visits.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">Tidak ada data pada periode ini.</td></tr>
              )}
              {visits.map((v) => (
                <tr key={v.visitId}>
                  <td className="px-4 py-2">{v.orderNumber}</td>
                  <td className="px-4 py-2">{v.salesName}</td>
                  <td className="px-4 py-2">{v.warungName}</td>
                  <td className="px-4 py-2">{formatDateTime(v.checkedInAt)}</td>
                  <td className="px-4 py-2">{formatDateTime(v.checkedOutAt)}</td>
                  <td className="px-4 py-2 capitalize">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
