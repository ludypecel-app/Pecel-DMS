"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Buat Pesanan" sekarang berupa modal di halaman /orders (bukan halaman
// terpisah), konsisten dengan pola "Tambah X" lainnya. Rute ini dipertahankan
// supaya tautan/bookmark lama tidak 404 — langsung redirect dan membuka
// modalnya di sana (lihat penanganan ?new=1 di app/(app)/orders/page.tsx).
export default function NewOrderRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders?new=1");
  }, [router]);

  return null;
}
