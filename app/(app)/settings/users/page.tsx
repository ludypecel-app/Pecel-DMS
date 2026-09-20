"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TextField, SelectField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import type { User } from "@/types/entities";

type UserRow = Omit<User, "password_hash">;

const emptyForm = { name: "", email: "", password: "", role: "sales", sales_id: "" };

export default function UsersPage() {
  const salesList = useActiveSales();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    setUsers(json.data ?? []);
    if (!opts?.silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useAutoRefresh(() => fetchUsers({ silent: true }), 15000);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, sales_id: user.sales_id ?? "" });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      sales_id: form.role === "sales" ? form.sales_id : undefined,
    };
    if (form.password) payload.password = form.password; // kosong = tidak diubah (saat edit)

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
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
        setErrors({ _form: json.error ?? "Gagal menyimpan user" });
      }
      setSubmitting(false);
      return;
    }

    setModalOpen(false);
    setSubmitting(false);
    fetchUsers();
  }

  async function handleToggleStatus(user: UserRow) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchUsers();
  }

  function openDeleteModal(user: UserRow) {
    setDeleteTarget(user);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/users/${deleteTarget.id}?permanent=true`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(json.error ?? "Gagal menghapus data");
      return;
    }
    setDeleteTarget(null);
    fetchUsers();
  }

  function salesName(id?: string) {
    return salesList.find((s) => s.id === id)?.name ?? "-";
  }

  const columns: Column<UserRow>[] = [
    { key: "name", header: "Nama", render: (u) => u.name },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "role", header: "Role", render: (u) => (u.role === "admin" ? "Admin" : "Sales") },
    { key: "sales", header: "Terhubung ke Sales", render: (u) => (u.role === "sales" ? salesName(u.sales_id) : "-"), hideOnMobile: true },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: "Aksi",
      render: (u) => (
        <div className="flex gap-3">
          <button type="button" onClick={() => openEditModal(u)} className="text-sm font-medium text-forest-700 hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => handleToggleStatus(u)} className="text-sm font-medium text-ink-muted hover:underline">
            {u.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button type="button" onClick={() => openDeleteModal(u)} className="text-sm font-medium text-danger hover:underline">
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
          <h1 className="h1 !text-[20px]">Pengguna</h1>
          <p className="text-sm text-ink-muted">Kelola akun login admin & sales</p>
        </div>
        <button type="button" onClick={openCreateModal} className="flex items-center justify-center gap-1.5 rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600">
          <Plus size={16} />
          Tambah User
        </button>
      </div>

      <DataTable columns={columns} data={users} getRowId={(u) => u.id} isLoading={isLoading} emptyMessage="Belum ada user." />

      <Modal title={editing ? "Edit User" : "Tambah User"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors._form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors._form}</p>}
          <TextField label="Nama" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} placeholder="mis. Budi Santoso" required />
          <TextField label="Email" type="text" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} error={errors.email} placeholder="mis. budi@pecel-dms.com" required />
          <TextField
            label={editing ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
            type="text"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            error={errors.password}
            placeholder="Minimal 8 karakter"
            required={!editing}
          />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v, sales_id: v === "admin" ? "" : f.sales_id }))}
            error={errors.role}
            required
            options={[
              { value: "admin", label: "Admin" },
              { value: "sales", label: "Sales" },
            ]}
          />
          {form.role === "sales" && (
            <SelectField
              label="Hubungkan ke Data Sales"
              value={form.sales_id}
              onChange={(v) => setForm((f) => ({ ...f, sales_id: v }))}
              error={errors.sales_id}
              required
              options={salesList.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus User"
        message={`Hapus permanen user "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
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
