"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TextField } from "@/components/forms/fields";
import type { Region } from "@/types/entities";

type StatusFilter = "" | "active" | "inactive";

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState({ code: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/master-data/regions?${params.toString()}`);
    const json = await res.json();
    setRegions(json.data ?? []);
    setIsLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    // Debounce ringan supaya tidak fetch di setiap ketikan.
    const timeout = setTimeout(fetchRegions, 300);
    return () => clearTimeout(timeout);
  }, [fetchRegions]);

  function openCreateModal() {
    setEditing(null);
    setForm({ code: "", name: "" });
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(region: Region) {
    setEditing(region);
    setForm({ code: region.code, name: region.name });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const url = editing ? `/api/master-data/regions/${editing.id}` : "/api/master-data/regions";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
    fetchRegions();
  }

  async function handleToggleStatus(region: Region) {
    const nextStatus = region.status === "active" ? "inactive" : "active";
    await fetch(`/api/master-data/regions/${region.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchRegions();
  }

  function openDeleteModal(region: Region) {
    setDeleteTarget(region);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/master-data/regions/${deleteTarget.id}?permanent=true`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(json.error ?? "Gagal menghapus data");
      return;
    }
    setDeleteTarget(null);
    fetchRegions();
  }

  const columns: Column<Region>[] = [
    { key: "code", header: "Kode", render: (r) => r.code },
    { key: "name", header: "Nama Wilayah", render: (r) => r.name },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Aksi",
      render: (r) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => openEditModal(r)}
            className="text-sm font-medium text-forest-700 hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(r)}
            className="text-sm font-medium text-ink-muted hover:underline"
          >
            {r.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            type="button"
            onClick={() => openDeleteModal(r)}
            className="text-sm font-medium text-danger hover:underline"
          >
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Wilayah</h1>
          <p className="text-sm text-ink-muted">Kelola data wilayah distribusi</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600"
        >
          <Plus size={16} />
          Tambah Wilayah
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama wilayah..."
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
        data={regions}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="Belum ada wilayah. Tambahkan wilayah pertama Anda."
      />

      <Modal
        title={editing ? "Edit Wilayah" : "Tambah Wilayah"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors._form && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors._form}</p>
          )}
          <TextField
            label="Kode Wilayah"
            value={form.code}
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
            error={errors.code}
            placeholder="mis. MLG-01"
            required
          />
          <TextField
            label="Nama Wilayah"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            error={errors.name}
            placeholder="mis. Malang Kota"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Wilayah"
        message={`Hapus permanen wilayah "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
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
