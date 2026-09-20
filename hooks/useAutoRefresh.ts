"use client";

import { useEffect, useRef } from "react";

/**
 * Polling ringan supaya perubahan data yang dilakukan user lain (mis. admin
 * menugaskan sales, sales terima/tolak tugas, check-in/check-out, admin
 * konfirmasi kunjungan, dst.) langsung muncul di layar tanpa harus refresh
 * manual — tanpa perlu infrastruktur WebSocket/real-time terpisah karena
 * backend saat ini adalah Google Sheets (bukan database dengan dukungan
 * subscription).
 *
 * - Berhenti otomatis saat tab browser tidak aktif (hemat kuota Google
 *   Sheets API & bandwidth), dan langsung refresh sekali begitu tab aktif
 *   kembali supaya data tidak basi saat user balik.
 * - `callback` sebaiknya dipanggil dalam mode "silent" (tanpa menampilkan
 *   status "Memuat...") supaya tidak mengganggu/mengedipkan UI yang sedang
 *   dilihat/diisi user.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 8000) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;

    function tick() {
      if (document.visibilityState === "visible") {
        savedCallback.current();
      }
    }

    const id = setInterval(tick, intervalMs);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        savedCallback.current();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
