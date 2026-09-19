"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/fields";
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch(`/api/assignments/${id}/review`);
    const json = await res.json();
    if (res.ok) setData(json.data);
    else setError(json.error ?? "Gagal memuat data review");
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (isLoading) return <p className="text-sm text-neutral-500">Memuat...</p>;
  if (!data) return <p className="text-sm text-red-600">{error || "Data tidak ditemukan."}</p>;

  const canConfirm = data.status === "visited";
  const canReopen = data.status === "completed";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/assignments" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={15} /> Kembali ke Penugasan
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Review Kunjungan — {data.orderNumber}</h1>
        <p className="text-sm text-neutral-500">{data.warungName} · Sales: {data.salesName}</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data.status === "completed" && data.confirmedAt && (
        <div className="rounded-md bg-forest-50 px-3 py-2 text-sm text-forest-700">
          Dikonfirmasi selesai oleh {data.confirmedBy} pada {formatDateTime(data.confirmedAt)}.
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-neutral-500">Check-In</dt>
          <dd className="text-right">{formatDateTime(data.checkedInAt)}</dd>
          <dt className="text-neutral-500">Check-Out</dt>
          <dd className="text-right">{formatDateTime(data.checkedOutAt)}</dd>
        </dl>
        {data.visitNotes && <p className="mt-2 text-sm text-neutral-600">Catatan: {data.visitNotes}</p>}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Stok</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Produk</th>
                <th className="py-1 pr-2 font-medium">Kirim</th>
                <th className="py-1 pr-2 font-medium">Jual</th>
                <th className="py-1 pr-2 font-medium">Ditarik</th>
                <th className="py-1 font-medium">Sisa di Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
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

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Pembayaran</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-neutral-500">Total Tagihan</dt>
          <dd className="text-right font-medium">{formatPrice(data.totalTagihan)}</dd>
          <dt className="text-neutral-500">Status</dt>
          <dd className="text-right">{data.payment ? PAYMENT_STATUS_LABEL[data.payment.status] : "-"}</dd>
          <dt className="text-neutral-500">Metode</dt>
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
          <button type="button" onClick={handleConfirm} disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
            {submitting ? "Memproses..." : "Konfirmasi Selesai"}
          </button>
        )}
        {canReopen && (
          <button type="button" onClick={() => setReopenModal(true)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
            Buka Kembali untuk Koreksi
          </button>
        )}
        {!canConfirm && !canReopen && (
          <p className="text-sm text-neutral-500">
            Penugasan berstatus &quot;{data.status}&quot; — belum ada aksi yang tersedia di halaman ini.
          </p>
        )}
      </div>

      <Modal title="Buka Kembali untuk Koreksi" open={reopenModal} onClose={() => setReopenModal(false)}>
        <form onSubmit={handleReopen} className="space-y-3">
          <p className="text-xs text-neutral-500">
            Status akan dikembalikan ke Visited. Data stok/pembayaran yang sudah ada TIDAK dihapus — koreksi lanjutan
            saat ini perlu dilakukan manual (pengembangan form revisi otomatis menyusul).
          </p>
          <TextField label="Alasan" value={reopenReason} onChange={setReopenReason} placeholder="Wajib diisi" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setReopenModal(false)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
              Batal
            </button>
            <button type="submit" disabled={submitting || !reopenReason.trim()} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Memproses..." : "Buka Kembali"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
