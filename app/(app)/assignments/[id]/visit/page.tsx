"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SelectField, TextField } from "@/components/forms/fields";
import type { VisitFormData } from "@/features/visits/types/visit.types";

interface RowState {
  sold: string;
  returned: string;
}

export default function VisitDataEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<VisitFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [paymentStatus, setPaymentStatus] = useState("belum_bayar");
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchForm = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch(`/api/assignments/${id}/visit`);
    const json = await res.json();
    if (res.ok) {
      setForm(json.data);
      const initialRows: Record<string, RowState> = {};
      json.data.rows.forEach((r: { product_id: string }) => {
        initialRows[r.product_id] = { sold: "0", returned: "0" };
      });
      setRows(initialRows);
    } else {
      setError(json.error ?? "Gagal memuat data kunjungan");
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  function updateRow(productId: string, patch: Partial<RowState>) {
    setRows((prev) => {
      const current = prev[productId] ?? { sold: "0", returned: "0" };
      const next: RowState = {
        sold: patch.sold ?? current.sold,
        returned: patch.returned ?? current.returned,
      };
      return { ...prev, [productId]: next };
    });
  }

  const computed = useMemo(() => {
    if (!form) return [];
    return form.rows.map((r) => {
      const sold = Number(rows[r.product_id]?.sold) || 0;
      const returned = Number(rows[r.product_id]?.returned) || 0;
      const sisaStok = r.shipped_quantity - sold;
      const totalStokSaatIni = sisaStok - returned;
      return { ...r, sold, returned, sisaStok, totalStokSaatIni };
    });
  }, [form, rows]);

  const totalTagihan = computed.reduce((sum, r) => sum + r.sold * r.unit_price, 0);
  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      items: computed.map((r) => ({
        product_id: r.product_id,
        sold_quantity: r.sold,
        returned_quantity: r.returned,
      })),
      payment: { status: paymentStatus, method: paymentMethod, proof_url: proofUrl || undefined },
      notes: notes || undefined,
    };

    const res = await fetch(`/api/assignments/${id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Gagal menyimpan Check-Out");
      return;
    }
    setSuccess(true);
  }

  if (isLoading) return <p className="text-sm text-neutral-500">Memuat...</p>;
  if (!form) return <p className="text-sm text-red-600">{error || "Data tidak ditemukan."}</p>;

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Check-Out Berhasil</h1>
        <p className="text-sm text-neutral-500">
          Data kunjungan untuk {form.orderNumber} telah tersimpan dan menunggu konfirmasi admin.
        </p>
        <Link href="/assignments" className="inline-block rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600">
          Kembali ke Penugasan
        </Link>
      </div>
    );
  }

  if (form.alreadyCheckedOut) {
    return <p className="text-sm text-neutral-500">Kunjungan untuk pesanan ini sudah di-check-out sebelumnya.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/assignments" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={15} /> Kembali ke Penugasan
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Pendataan Kunjungan</h1>
        <p className="text-sm text-neutral-500">{form.orderNumber} · {form.warungName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-700">Pendataan Stok</h2>
          {computed.map((r) => (
            <div key={r.product_id} className="space-y-2 rounded-md border border-neutral-100 p-3">
              <p className="text-sm font-medium text-neutral-800">{r.product_name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-neutral-500">Jumlah Pengiriman</p>
                  <p className="font-medium text-neutral-700">{r.shipped_quantity}</p>
                </div>
                <div>
                  <label className="block text-neutral-500">Penjualan</label>
                  <input
                    type="number"
                    min={0}
                    max={r.shipped_quantity}
                    value={rows[r.product_id]?.sold ?? "0"}
                    onChange={(e) => updateRow(r.product_id, { sold: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <p className="text-neutral-500">Sisa Stok</p>
                  <p className="font-medium text-neutral-700">{r.sisaStok}</p>
                </div>
                <div>
                  <label className="block text-neutral-500">Produk Ditarik</label>
                  <input
                    type="number"
                    min={0}
                    max={r.sisaStok}
                    value={rows[r.product_id]?.returned ?? "0"}
                    onChange={(e) => updateRow(r.product_id, { returned: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Total Stok Saat Ini: <span className="font-medium text-neutral-700">{r.totalStokSaatIni}</span>
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-700">Pembayaran</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Total Tagihan</span>
            <span className="font-semibold text-neutral-900">{formatPrice(totalTagihan)}</span>
          </div>
          <SelectField
            label="Status Pembayaran"
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={[
              { value: "belum_bayar", label: "Belum Bayar" },
              { value: "sebagian", label: "Sebagian" },
              { value: "lunas", label: "Lunas" },
              { value: "ditangguhkan", label: "Ditangguhkan" },
            ]}
          />
          <SelectField
            label="Metode Pembayaran"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              { value: "tunai", label: "Tunai" },
              { value: "transfer", label: "Transfer" },
              { value: "qris", label: "QRIS" },
              { value: "lainnya", label: "Lainnya" },
            ]}
          />
          <TextField
            label="Link Bukti Pembayaran (opsional)"
            value={proofUrl}
            onChange={setProofUrl}
            placeholder="Tempel link foto/file bukti pembayaran"
          />
          <p className="text-xs text-neutral-400">
            Upload foto langsung belum tersedia — integrasi penyimpanan file (Google Drive) menyusul. Untuk saat ini, unggah foto ke penyimpanan pilihan Anda lalu tempel link-nya di sini.
          </p>
        </section>

        <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-neutral-700">Catatan Kunjungan (opsional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
        </section>

        <div className="flex justify-end gap-2 pb-4">
          <button type="button" onClick={() => router.push("/assignments")} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Batal
          </button>
          <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-5 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
            {submitting ? "Menyimpan..." : "Simpan / Check-Out"}
          </button>
        </div>
      </form>
    </div>
  );
}
