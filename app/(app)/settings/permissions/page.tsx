"use client";

import { useEffect, useState, useCallback } from "react";
import { PERMISSION_KEYS, type PermissionKey } from "@/config/permissions";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const PERMISSION_LABEL: Record<PermissionKey, string> = {
  "orders.view": "Melihat pesanan",
  "orders.create": "Membuat pesanan",
  "orders.edit": "Mengedit pesanan",
  "orders.cancel": "Membatalkan pesanan",
  "assignments.view": "Melihat penugasan",
  "assignments.create": "Membuat penugasan",
  "assignments.accept": "Menerima penugasan",
  "assignments.reject": "Menolak penugasan",
  "picking.manage": "Mengelola picking",
  "delivery.start": "Memulai pengiriman",
  "visit.checkin": "Check-in kunjungan",
  "visit.checkout": "Check-out kunjungan",
  "payments.view": "Melihat pembayaran",
  "payments.manage": "Mengelola pembayaran",
  "master_data.manage": "Mengelola master data",
  "users.manage": "Mengelola pengguna",
  "permissions.manage": "Mengelola hak akses",
};

export default function PermissionsPage() {
  const [mapping, setMapping] = useState<Record<"admin" | "sales", PermissionKey[]>>({ admin: [], sales: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMapping = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    const res = await fetch("/api/permissions");
    const json = await res.json();
    if (res.ok) setMapping(json.data);
    if (!opts?.silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMapping();
  }, [fetchMapping]);

  // Jangan poll saat sedang menyimpan toggle sendiri supaya tidak menimpa
  // perubahan yang belum selesai disimpan.
  useAutoRefresh(() => {
    if (!saving) fetchMapping({ silent: true });
  }, 15000);

  async function toggle(role: "admin" | "sales", permission: PermissionKey) {
    const current = mapping[role] ?? [];
    const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];

    setMapping((prev) => ({ ...prev, [role]: next }));
    setSaving(true);
    setError("");

    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permissions: next }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Gagal menyimpan perubahan");
      fetchMapping(); // revert ke data server
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1 !text-[20px]">Hak Akses</h1>
        <p className="text-sm text-ink-muted">Atur permission untuk setiap role. Perubahan tersimpan otomatis.</p>
      </div>

      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-page text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Permission</th>
                <th className="px-4 py-2.5 text-center font-medium">Admin</th>
                <th className="px-4 py-2.5 text-center font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSION_KEYS.map((key) => (
                <tr key={key}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-ink">{PERMISSION_LABEL[key]}</p>
                    <p className="text-xs text-ink-muted">{key}</p>
                  </td>
                  {(["admin", "sales"] as const).map((role) => (
                    <td key={role} className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={mapping[role]?.includes(key) ?? false}
                        onChange={() => toggle(role, key)}
                        disabled={saving || (role === "admin" && key === "permissions.manage")}
                        className="h-4 w-4 rounded border-border text-forest-700 focus:ring-forest-600"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        Catatan: menu & aksi di aplikasi saat ini digerbang oleh <span className="font-medium">role</span> (Admin/Sales), bukan permission granular per pengguna — tabel ini menyiapkan data untuk penegakan permission yang lebih detail di iterasi berikutnya.
      </p>
    </div>
  );
}
