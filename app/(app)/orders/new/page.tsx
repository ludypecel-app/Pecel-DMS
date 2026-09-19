"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { SelectField, TextField } from "@/components/forms/fields";

interface ItemRow {
  product_id: string;
  quantity: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const regions = useActiveRegions();
  const products = useActiveProducts();

  const [regionFilter, setRegionFilter] = useState(""); // filter bantu, tidak dikirim ke server
  const warungs = useActiveWarungs(regionFilter || undefined);

  const [warungId, setWarungId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ product_id: "", quantity: "1" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function addItemRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: "1" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              product_id: patch.product_id ?? row.product_id,
              quantity: patch.quantity ?? row.quantity,
            }
          : row
      )
    );
  }

  const selectedWarung = warungs.find((w) => w.id === warungId);

  const rowsWithPrice = useMemo(
    () =>
      items.map((row) => {
        const product = products.find((p) => p.id === row.product_id);
        const qty = Number(row.quantity) || 0;
        const subtotal = product ? product.price * qty : 0;
        return { ...row, product, subtotal };
      }),
    [items, products]
  );

  const total = rowsWithPrice.reduce((sum, r) => sum + r.subtotal, 0);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");

    const payload = {
      warung_id: warungId,
      delivery_date: deliveryDate,
      items: items
        .filter((r) => r.product_id)
        .map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity) || 0 })),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      if (json.details) {
        const flat: Record<string, string> = {};
        Object.entries(json.details).forEach(([key, val]) => {
          flat[key] = Array.isArray(val) ? (val[0] as string) : String(val);
        });
        setErrors(flat);
      } else {
        setFormError(json.error ?? "Gagal membuat pesanan");
      }
      setSubmitting(false);
      return;
    }

    router.push(`/orders/${json.data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Buat Pesanan</h1>
        <p className="text-sm text-neutral-500">
          Pesanan dibuat tanpa memilih sales terlebih dahulu — penugasan dilakukan setelahnya.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

        <SelectField
          label="Filter Wilayah (opsional, untuk mempersempit pilihan warung)"
          value={regionFilter}
          onChange={(v) => {
            setRegionFilter(v);
            setWarungId(""); // reset warung terpilih saat wilayah berubah
          }}
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
        />

        <SelectField
          label="Warung"
          value={warungId}
          onChange={setWarungId}
          error={errors.warung_id}
          options={warungs.map((w) => ({ value: w.id, label: w.name }))}
        />
        {selectedWarung && (
          <p className="-mt-2 text-xs text-neutral-500">
            Wilayah otomatis: <span className="font-medium">{regions.find((r) => r.id === selectedWarung.region_id)?.name ?? "-"}</span>
          </p>
        )}

        <TextField
          label="Tanggal Pengiriman"
          type="date"
          value={deliveryDate}
          onChange={setDeliveryDate}
          error={errors.delivery_date}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Produk Pesanan</span>
            <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-sm font-medium text-forest-700 hover:underline">
              <Plus size={14} /> Tambah Produk
            </button>
          </div>

          {rowsWithPrice.map((row, index) => (
            <div key={index} className="flex items-end gap-2 rounded-md border border-neutral-200 p-2.5">
              <div className="flex-1">
                <SelectField
                  label="Produk"
                  value={row.product_id}
                  onChange={(v) => updateItemRow(index, { product_id: v })}
                  options={products.map((p) => ({ value: p.id, label: `${p.name} — ${formatPrice(p.price)}` }))}
                />
              </div>
              <div className="w-24">
                <TextField label="Jumlah" type="number" value={row.quantity} onChange={(v) => updateItemRow(index, { quantity: v })} />
              </div>
              <div className="w-28 pb-2 text-right text-sm text-neutral-600">{formatPrice(row.subtotal)}</div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItemRow(index)} className="mb-2 text-neutral-400 hover:text-red-600" aria-label="Hapus produk">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="text-sm font-medium text-neutral-700">Total Pesanan</span>
          <span className="text-base font-semibold text-neutral-900">{formatPrice(total)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => router.push("/orders")} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Batal
          </button>
          <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
            {submitting ? "Menyimpan..." : "Simpan Pesanan"}
          </button>
        </div>
      </form>
    </div>
  );
}
