"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { Product } from "@/types/entities";

type StatusFilter = "" | "active" | "inactive";

const emptyForm = { name: "", unit: "", price: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/master-data/products?${params.toString()}`);
      const json = await res.json();
      setProducts(json.data ?? []);
      if (!opts?.silent) setIsLoading(false);
    },
    [search, statusFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  useAutoRefresh(() => fetchProducts({ silent: true }), 15000);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      unit: product.unit,
      price: String(product.price),
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = { ...form, price: Number(form.price) };
    const url = editing ? `/api/master-data/products/${editing.id}` : "/api/master-data/products";
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
    fetchProducts();
  }

  async function handleToggleStatus(product: Product) {
    const nextStatus = product.status === "active" ? "inactive" : "active";
    await fetch(`/api/master-data/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchProducts();
  }

  function openDeleteModal(product: Product) {
    setDeleteTarget(product);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/master-data/products/${deleteTarget.id}?permanent=true`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(json.error ?? "Gagal menghapus data");
      return;
    }
    setDeleteTarget(null);
    fetchProducts();
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const columns: Column<Product>[] = [
    { key: "code", header: "Kode", render: (p) => p.code },
    { key: "name", header: "Nama Produk", render: (p) => p.name },
    { key: "unit", header: "Satuan", render: (p) => p.unit, hideOnMobile: true },
    { key: "price", header: "Harga", render: (p) => formatPrice(p.price) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "Aksi",
      render: (p) => (
        <div className="flex gap-3">
          <Button variant="tertiary" tone="brand" inline onClick={() => openEditModal(p)}>
            Edit
          </Button>
          <Button variant="tertiary" tone="neutral" inline onClick={() => handleToggleStatus(p)}>
            {p.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button variant="tertiary" tone="danger" inline onClick={() => openDeleteModal(p)}>
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
          <h1 className="h1 !text-[20px]">Produk</h1>
          <p className="text-sm text-ink-muted">Kelola daftar produk pecel</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} />
          Tambah Produk
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={products}
        getRowId={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="Belum ada produk. Tambahkan produk pertama Anda."
      />

      <Modal title={editing ? "Edit Produk" : "Tambah Produk"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors._form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors._form}</p>}
          {editing ? (
            <p className="-mt-1 text-xs text-ink-muted">
              Kode Produk: <span className="font-medium text-ink">{editing.code}</span> (dibuat otomatis oleh sistem, tidak bisa diubah)
            </p>
          ) : (
            <p className="-mt-1 text-xs text-ink-muted">Kode produk akan dibuat otomatis oleh sistem setelah disimpan.</p>
          )}
          <TextField label="Nama Produk" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} placeholder="mis. Pecel Original 250gr" required />
          <TextField label="Satuan" value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} error={errors.unit} placeholder="mis. pack" required />
          <TextField label="Harga" type="currency" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} error={errors.price} placeholder="mis. 15.000" required />
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
        title="Hapus Produk"
        message={`Hapus permanen produk "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
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
