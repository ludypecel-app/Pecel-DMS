"use client";

import { useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";

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
  const [tab, setTab] = useState<"payments" | "visits">("payments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (tab === "payments") {
      const res = await fetch(`/api/reports/payments?${params.toString()}`);
      const json = await res.json();
      setPayments(json.data ?? []);
    } else {
      if (salesFilter) params.set("salesId", salesFilter);
      const res = await fetch(`/api/reports/visits?${params.toString()}`);
      const json = await res.json();
      setVisits(json.data ?? []);
    }
    setIsLoading(false);
  }, [tab, from, to, salesFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-page"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`px-3 py-2 text-sm font-medium ${tab === "payments" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Laporan Pembayaran
        </button>
        <button
          type="button"
          onClick={() => setTab("visits")}
          className={`px-3 py-2 text-sm font-medium ${tab === "visits" ? "border-b-2 border-forest-700 text-forest-700" : "text-ink-muted"}`}
        >
          Monitoring Kunjungan
        </button>
      </div>

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

      {isLoading ? (
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
