"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { WARUNG_PAYMENT_TERM_LABEL, WARUNG_PAYMENT_TERM_COLOR } from "@/features/warungs/constants";
import type { Warung, WarungPaymentTerm } from "@/types/entities";

type StatusFilter = "" | "active" | "inactive";

const emptyForm = {
  name: "",
  region_id: "",
  address: "",
  phone: "",
  latitude: "",
  longitude: "",
  payment_term: "cash_on_delivery" as WarungPaymentTerm,
};

const PAYMENT_TERM_OPTIONS = (Object.keys(WARUNG_PAYMENT_TERM_LABEL) as WarungPaymentTerm[]).map((value) => ({
  value,
  label: WARUNG_PAYMENT_TERM_LABEL[value],
}));

export default function WarungsPage() {
  const regions = useActiveRegions();
  const [items, setItems] = useState<Warung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [regionFilter, setRegionFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warung | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Warung | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (regionFilter) params.set("regionId", regionFilter);
      const res = await fetch(`/api/master-data/warungs?${params.toString()}`);
      const json = await res.json();
      setItems(json.data ?? []);
      if (!opts?.silent) setIsLoading(false);
    },
    [search, statusFilter, regionFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  useAutoRefresh(() => fetchItems({ silent: true }), 15000);

  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? "-";
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(warung: Warung) {
    setEditing(warung);
    setForm({
      name: warung.name,
      region_id: warung.region_id,
      address: warung.address,
      phone: warung.phone ?? "",
      latitude: warung.latitude != null ? String(warung.latitude) : "",
      longitude: warung.longitude != null ? String(warung.longitude) : "",
      // Fallback untuk data lama (dibuat sebelum opsi ini ada).
      payment_term: warung.payment_term ?? "cash_on_delivery",
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    };
    const url = editing ? `/api/master-data/warungs/${editing.id}` : "/api/master-data/warungs";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
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
        setErrors({ _form: json.error ?? "Gagal menyimpan data" });
      }
      setSubmitting(false);
      return;
    }

    setModalOpen(false);
    setSubmitting(false);
    fetchItems();
  }

  async function handleToggleStatus(warung: Warung) {
    const nextStatus = warung.status === "active" ? "inactive" : "active";
    await fetch(`/api/master-data/warungs/${warung.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchItems();
  }

  function openDeleteModal(warung: Warung) {
    setDeleteTarget(warung);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/master-data/warungs/${deleteTarget.id}?permanent=true`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(json.error ?? "Gagal menghapus data");
      return;
    }
    setDeleteTarget(null);
    fetchItems();
  }

  const columns: Column<Warung>[] = [
    { key: "name", header: "Nama Warung", render: (w) => w.name },
    { key: "region", header: "Wilayah", render: (w) => regionName(w.region_id) },
    { key: "address", header: "Alamat", render: (w) => w.address, hideOnMobile: true },
    {
      key: "payment_term",
      header: "Metode Pembayaran",
      render: (w) => {
        const term = w.payment_term ?? "cash_on_delivery";
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${WARUNG_PAYMENT_TERM_COLOR[term]}`}>
            {WARUNG_PAYMENT_TERM_LABEL[term]}
          </span>
        );
      },
      hideOnMobile: true,
    },
    { key: "status", header: "Status", render: (w) => <StatusBadge status={w.status} /> },
    {
      key: "actions",
      header: "Aksi",
      render: (w) => (
        <div className="flex gap-3">
          <Button variant="tertiary" tone="brand" inline onClick={() => openEditModal(w)}>
            Edit
          </Button>
          <Button variant="tertiary" tone="neutral" inline onClick={() => handleToggleStatus(w)}>
            {w.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button variant="tertiary" tone="danger" inline onClick={() => openDeleteModal(w)}>
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Warung</h1>
          <p className="text-sm text-ink-muted">Kelola data warung/toko pelanggan</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} />
          Tambah Warung
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau alamat warung..."
            className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Wilayah</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <DataTable columns={columns} data={items} getRowId={(w) => w.id} isLoading={isLoading} emptyMessage="Belum ada warung. Tambahkan warung pertama Anda." />

      <Modal title={editing ? "Edit Warung" : "Tambah Warung"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors._form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors._form}</p>}
          <TextField label="Nama Warung" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} placeholder="mis. Warung Bu Sri" required />
          <SelectField
            label="Wilayah"
            value={form.region_id}
            onChange={(v) => setForm((f) => ({ ...f, region_id: v }))}
            error={errors.region_id}
            required
            options={regions.map((r) => ({ value: r.id, label: r.name }))}
          />
          <TextField label="Alamat" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} error={errors.address} placeholder="mis. Jl. Merdeka No. 10" required />
          <TextField label="Nomor Telepon" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={errors.phone} placeholder="mis. 081234567890" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Latitude" type="number" value={form.latitude} onChange={(v) => setForm((f) => ({ ...f, latitude: v }))} error={errors.latitude} placeholder="mis. -7.966620" required />
            <TextField label="Longitude" type="number" value={form.longitude} onChange={(v) => setForm((f) => ({ ...f, longitude: v }))} error={errors.longitude} placeholder="mis. 112.632629" required />
          </div>
          <SelectField
            label="Metode Pembayaran"
            value={form.payment_term}
            onChange={(v) => setForm((f) => ({ ...f, payment_term: v as WarungPaymentTerm }))}
            error={errors.payment_term}
            required
            options={PAYMENT_TERM_OPTIONS}
          />
          <p className="-mt-2 text-xs text-ink-muted">
            {form.payment_term === "next_visit"
              ? "Warung membayar pada kunjungan berikutnya, dengan menyerahkan hasil penjualan produk yang dikirim sebelumnya."
              : "Warung membayar tunai sejumlah produk yang dikirim saat itu juga."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Warung"
        message={`Hapus permanen warung "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Hapus"
        danger
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
