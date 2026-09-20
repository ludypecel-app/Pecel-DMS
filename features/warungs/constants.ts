import type { WarungPaymentTerm } from "@/types/entities";

export const WARUNG_PAYMENT_TERM_LABEL: Record<WarungPaymentTerm, string> = {
  cash_on_delivery: "Bayar Langsung",
  next_visit: "Bayar di Kunjungan Berikutnya",
};

export const WARUNG_PAYMENT_TERM_DESCRIPTION: Record<WarungPaymentTerm, string> = {
  cash_on_delivery: "Warung membayar tunai sejumlah produk yang dikirim saat itu juga.",
  next_visit:
    "Warung membayar pada kunjungan sales berikutnya, dengan menyerahkan hasil penjualan produk yang dikirim sebelumnya.",
};

export const WARUNG_PAYMENT_TERM_COLOR: Record<WarungPaymentTerm, string> = {
  cash_on_delivery: "bg-forest-100 text-forest-700",
  next_visit: "bg-turmeric-50 text-turmeric-600",
};
