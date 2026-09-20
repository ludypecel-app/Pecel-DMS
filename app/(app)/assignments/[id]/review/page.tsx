"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { VisitReviewData } from "@/features/visits/types/visit.types";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
  ditangguhkan: "Ditangguhkan",
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
  lainnya: "Lainnya",
};

export default function AssignmentReviewPage() {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<VisitReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reopenModal, setReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      const res = await fetch(`/api/assignments/${id}/review`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else setError(json.error ?? "Gagal memuat data review");
      if (!opts?.silent) setIsLoading(false);
    },
    [id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Kalau sales baru saja check-out (mengisi data kunjungan) saat halaman
  // ini terbuka, datanya ikut muncul otomatis tanpa refresh manual.
  useAutoRefresh(() => fetchData({ silent: true }), 8000);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("id-ID") : "-");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/assignments/${id}/confirm`, { method: "POST" });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Gagal mengonfirmasi");
      return;
    }
    fetchData();
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/assignments/${id}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reopenReason }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Gagal membuka kembali");
      return;
    }
    setReopenModal(false);
    setReopenReason("");
    fetchData();
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Memuat...</p>;
  if (!data) return <p className="text-sm text-danger">{error || "Data tidak ditemukan."}</p>;

  const canConfirm = data.status === "visited";
  const canReopen = data.status === "completed";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/assignments" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Kembali ke Penugasan
      </Link>

      <div>
        <h1 className="h1 !text-[20px]">Review Kunjungan — {data.orderNumber}</h1>
        <p className="text-sm text-ink-muted">{data.warungName} · Sales: {data.salesName}</p>
      </div>

      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {data.status === "completed" && data.confirmedAt && (
        <div className="rounded-md bg-forest-50 px-3 py-2 text-sm text-forest-700">
          Dikonfirmasi selesai oleh {data.confirmedBy} pada {formatDateTime(data.confirmedAt)}.
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-muted">Check-In</dt>
          <dd className="text-right">{formatDateTime(data.checkedInAt)}</dd>
          <dt className="text-ink-muted">Check-Out</dt>
          <dd className="text-right">{formatDateTime(data.checkedOutAt)}</dd>
        </dl>
        {data.checkedInOutOfRange && (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertTriangle size={15} className="shrink-0" />
            Check-in tercatat ~{data.checkedInDistanceM}m dari titik koordinat warung — di luar radius wajar,
            mohon ditinjau.
          </p>
        )}
        {data.visitNotes && <p className="mt-2 text-sm text-ink-muted">Catatan: {data.visitNotes}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Stok</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 pr-2 font-medium">Produk</th>
                <th className="py-1 pr-2 font-medium">Kirim</th>
                <th className="py-1 pr-2 font-medium">Jual</th>
                <th className="py-1 pr-2 font-medium">Ditarik</th>
                <th className="py-1 font-medium">Sisa di Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.product_id}>
                  <td className="py-1.5 pr-2">{r.product_name}</td>
                  <td className="py-1.5 pr-2">{r.shipped_quantity}</td>
                  <td className="py-1.5 pr-2">{r.sold_quantity}</td>
                  <td className="py-1.5 pr-2">{r.returned_quantity}</td>
                  <td className="py-1.5">{r.current_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Pembayaran</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-muted">Total Tagihan</dt>
          <dd className="text-right font-medium">{formatPrice(data.totalTagihan)}</dd>
          <dt className="text-ink-muted">Status</dt>
          <dd className="text-right">{data.payment ? PAYMENT_STATUS_LABEL[data.payment.status] : "-"}</dd>
          <dt className="text-ink-muted">Metode</dt>
          <dd className="text-right">{data.payment ? PAYMENT_METHOD_LABEL[data.payment.method] : "-"}</dd>
        </dl>
        {data.payment?.proofUrl && (
          <a href={data.payment.proofUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-forest-700 hover:underline">
            Lihat bukti pembayaran →
          </a>
        )}
      </div>

      <div className="flex gap-2 pb-4">
        {canConfirm && (
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Memproses..." : "Konfirmasi Selesai"}
          </Button>
        )}
        {canReopen && (
          <Button variant="tertiary" tone="neutral" onClick={() => setReopenModal(true)}>
            Buka Kembali untuk Koreksi
          </Button>
        )}
        {!canConfirm && !canReopen && (
          <p className="text-sm text-ink-muted">
            Penugasan berstatus &quot;{data.status}&quot; — belum ada aksi yang tersedia di halaman ini.
          </p>
        )}
      </div>

      <Modal title="Buka Kembali untuk Koreksi" open={reopenModal} onClose={() => setReopenModal(false)}>
        <form onSubmit={handleReopen} className="space-y-3">
          <p className="text-xs text-ink-muted">
            Status akan dikembalikan ke Visited. Data stok/pembayaran yang sudah ada TIDAK dihapus — koreksi lanjutan
            saat ini perlu dilakukan manual (pengembangan form revisi otomatis menyusul).
          </p>
          <TextField label="Alasan" value={reopenReason} onChange={setReopenReason} placeholder="mis. Jumlah retur tidak sesuai, perlu dikoreksi sales" required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setReopenModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !reopenReason.trim()}>
              {submitting ? "Memproses..." : "Buka Kembali"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
