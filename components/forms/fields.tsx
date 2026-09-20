"use client";

import { ChevronDown } from "lucide-react";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

/** Menyisipkan "." setiap 3 digit dari kanan: "15000" -> "15.000". */
function formatThousands(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Membuang semua karakter selain digit (termasuk "." pemisah ribuan). */
function onlyDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

interface TextFieldProps extends Omit<FieldWrapperProps, "children"> {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "tel" | "date" | "currency";
  placeholder?: string;
}

export function TextField({ label, error, value, onChange, type = "text", placeholder }: TextFieldProps) {
  // Field nominal Rupiah: tampilkan dengan pemisah ribuan ("15.000") sambil
  // tetap menyimpan & mengirim nilai murni angka ("15000") lewat onChange —
  // <input type="number"> bawaan browser tidak bisa menampilkan "." pemisah
  // ribuan sama sekali, jadi field ini pakai <input type="text"> dengan
  // format & filter manual.
  if (type === "currency") {
    return (
      <FieldWrapper label={label} error={error}>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(onlyDigits(value))}
            placeholder={placeholder}
            onChange={(e) => onChange(onlyDigits(e.target.value))}
            className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper label={label} error={error}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends Omit<FieldWrapperProps, "children"> {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, error, value, onChange, options }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <div className="relative">
        {/* appearance-none membuang panah bawaan tiap browser (yang
            posisi/jaraknya ke border tidak konsisten antar browser) supaya
            bisa diganti satu ikon custom dengan jarak yang rapi & seragam;
            pr-9 menyediakan ruang supaya teks opsi yang panjang tidak
            bertabrakan dengan ikon panah di kanan. */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-white py-2 pl-3 pr-9 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
        >
          <option value="">Pilih...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-muted"
        />
      </div>
    </FieldWrapper>
  );
}
