"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SelectField, TextField } from "@/components/forms/fields";
import { Button, ButtonLink } from "@/components/ui/Button";
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
  const totalStokSaatIni = computed.reduce((sum, r) => sum + r.totalStokSaatIni, 0);
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

  if (isLoading) return <p className="text-sm text-ink-muted">Memuat...</p>;
  if (!form) return <p className="text-sm text-danger">{error || "Data tidak ditemukan."}</p>;

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-lg border border-border bg-surface-raised p-6 text-center">
        <h1 className="h1 !text-[20px]">Check-Out Berhasil</h1>
        <p className="text-sm text-ink-muted">
          Data kunjungan untuk {form.orderNumber} telah tersimpan dan menunggu konfirmasi admin.
        </p>
        <ButtonLink variant="primary" href="/assignments">
          Kembali ke Penugasan
        </ButtonLink>
      </div>
    );
  }

  if (form.alreadyCheckedOut) {
    return <p className="text-sm text-ink-muted">Kunjungan untuk pesanan ini sudah di-check-out sebelumnya.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/assignments" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Kembali ke Penugasan
      </Link>

      <div>
        <h1 className="h1 !text-[20px]">Pendataan Kunjungan</h1>
        <p className="text-sm text-ink-muted">{form.orderNumber} · {form.warungName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <section className="space-y-2 rounded-lg border border-border bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Pendataan Stok</h2>
            <p className="text-xs text-ink-muted">
              Total Stok: <span className="font-semibold text-ink">{totalStokSaatIni}</span>
            </p>
          </div>
          {computed.map((r) => (
            <div key={r.product_id} className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-ink">{r.product_name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-ink-muted">Jumlah Pengiriman</p>
                  <p className="font-medium text-ink">{r.shipped_quantity}</p>
                </div>
                <div>
                  <label className="block text-ink-muted">Penjualan</label>
                  <input
                    type="number"
                    min={0}
                    max={r.shipped_quantity}
                    required
                    value={rows[r.product_id]?.sold ?? "0"}
                    onChange={(e) => updateRow(r.product_id, { sold: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <p className="text-ink-muted">Sisa Stok</p>
                  <p className="font-medium text-ink">{r.sisaStok}</p>
                </div>
                <div>
                  <label className="block text-ink-muted">Produk Ditarik</label>
                  <input
                    type="number"
                    min={0}
                    max={r.sisaStok}
                    required
                    value={rows[r.product_id]?.returned ?? "0"}
                    onChange={(e) => updateRow(r.product_id, { returned: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-border px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-ink-muted">
                Total Stok Saat Ini: <span className="font-medium text-ink">{r.totalStokSaatIni}</span>
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-semibold text-ink">Pembayaran</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Total Tagihan</span>
            <span className="font-semibold text-ink">{formatPrice(totalTagihan)}</span>
          </div>
          <SelectField
            label="Status Pembayaran"
            value={paymentStatus}
            onChange={setPaymentStatus}
            required
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
            required
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
          <p className="text-xs text-ink-muted">
            Upload foto langsung belum tersedia — integrasi penyimpanan file (Google Drive) menyusul. Untuk saat ini, unggah foto ke penyimpanan pilihan Anda lalu tempel link-nya di sini.
          </p>
        </section>

        <section className="space-y-2 rounded-lg border border-border bg-surface-raised p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Catatan Kunjungan (opsional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="mis. Warung minta pengiriman lebih pagi minggu depan"
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
        </section>

        <div className="flex justify-end gap-2 pb-4">
          <Button variant="tertiary" tone="neutral" onClick={() => router.push("/assignments")}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan / Check-Out"}
          </Button>
        </div>
      </form>
    </div>
  );
}
