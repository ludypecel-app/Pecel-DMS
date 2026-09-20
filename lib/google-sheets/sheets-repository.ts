import "server-only";
import { getSheetsClient } from "./client";
import { generateId } from "@/lib/utils/id";
import type { Repository } from "./repository";
import type { BaseEntity } from "@/types/entities";

interface SheetTable {
  spreadsheetId: string;
  sheetName: string; // nama tab di dalam spreadsheet, mis. "Region"
  columns: string[]; // urutan kolom sesuai header baris pertama
}

// Cache singkat di memori (per instance server) untuk mengurangi pemakaian
// quota Google Sheets API (100 request/100 detik/user). Cukup untuk MVP;
// pada beban tinggi sebaiknya diganti Redis/Vercel KV agar konsisten
// lintas instance.
const CACHE_TTL_MS = 15_000;
const readCache = new Map<string, { data: unknown[]; expiresAt: number }>();

// Dedup permintaan yang sedang berjalan per tabel: kalau beberapa request
// datang bersamaan sebelum cache di atas terisi (mis. Dashboard yang
// memanggil beberapa service sekaligus, atau beberapa user membuka
// halaman yang sama nyaris bersamaan), mereka menunggu SATU panggilan
// Google Sheets API yang sama alih-alih masing-masing menembak API sendiri
// — mengurangi latensi & pemakaian quota tanpa mengubah perilaku cache TTL.
const inFlightReads = new Map<string, Promise<string[][]>>();

function invalidateCache(table: SheetTable) {
  readCache.delete(`${table.spreadsheetId}:${table.sheetName}`);
}

function rowToObject<T>(headers: string[], row: string[]): T {
  const obj: Record<string, unknown> = {};
  headers.forEach((header, idx) => {
    const raw = row[idx] ?? "";
    // Konversi ringan: angka & boolean dikembalikan sebagai tipe aslinya.
    if (raw === "") obj[header] = undefined;
    else if (raw === "true" || raw === "false") obj[header] = raw === "true";
    // Round-trip check (String(Number(raw)) === raw) sebelum mengonversi ke
    // Number: mencegah nilai teks yang "terlihat" numerik tapi harus tetap
    // string kehilangan makna aslinya — contoh nyata: nomor telepon/kode
    // dengan angka nol di depan ("081234567890" atau "007") akan menjadi
    // 81234567890 / 7 kalau langsung di-Number()-kan. Angka asli (harga,
    // qty, lat/lng) tetap lolos konversi karena round-trip-nya cocok.
    else if (raw.trim() !== "" && !Number.isNaN(Number(raw)) && String(Number(raw)) === raw) {
      obj[header] = Number(raw);
    } else obj[header] = raw;
  });
  return obj as T;
}

function objectToRow(headers: string[], obj: Record<string, unknown>): string[] {
  return headers.map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

/**
 * Repository generik untuk entitas apa pun yang disimpan sebagai satu
 * sheet/tab di Google Spreadsheet. Satu instance = satu tabel.
 *
 * Catatan penting (lihat docs/architecture.md untuk detail mitigasi):
 * - ID di-generate di sini (UUID), bukan mengandalkan nomor baris.
 * - `update` memakai optimistic locking sederhana lewat `updated_at`:
 *   baris dibaca ulang sebelum ditulis untuk meminimalkan overwrite balapan;
 *   untuk MVP ini cukup, evaluasi ulang jika volume edit bersamaan tinggi.
 * - `softDelete` mengubah `status` jadi "inactive", tidak menghapus baris.
 */
export class SheetsRepository<T extends BaseEntity> implements Repository<T> {
  constructor(private table: SheetTable) {}

  private get client() {
    return getSheetsClient();
  }

  private get range() {
    return `${this.table.sheetName}!A:${this.columnLetter(this.table.columns.length)}`;
  }

  private columnLetter(n: number): string {
    let letter = "";
    let num = n;
    while (num > 0) {
      const rem = (num - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }

  private async readAllRows(): Promise<string[][]> {
    const cacheKey = `${this.table.spreadsheetId}:${this.table.sheetName}`;
    const cached = readCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as string[][];
    }

    // Sudah ada pembacaan tabel yang sama sedang berjalan (mis. dipanggil
    // dari beberapa Promise.all sekaligus) — ikut menunggu hasilnya alih-alih
    // menembak Google Sheets API lagi untuk data yang sama.
    const pending = inFlightReads.get(cacheKey);
    if (pending) return pending;

    const request = this.client.spreadsheets.values
      .get({ spreadsheetId: this.table.spreadsheetId, range: this.range })
      .then((res) => {
        const rows = (res.data.values ?? []) as string[][];
        readCache.set(cacheKey, { data: rows, expiresAt: Date.now() + CACHE_TTL_MS });
        return rows;
      })
      .finally(() => {
        inFlightReads.delete(cacheKey);
      });

    inFlightReads.set(cacheKey, request);
    return request;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const rows = await this.readAllRows();
    if (rows.length === 0) return [];
    const [, ...dataRows] = rows; // baris pertama = header
    let items = dataRows
      .filter((r) => r.length > 0 && r[0])
      .map((r) => rowToObject<T>(this.table.columns, r));

    if (filter) {
      items = items.filter((item) =>
        Object.entries(filter).every(([key, value]) => item[key as keyof T] === value)
      );
    }
    return items;
  }

  async findById(id: string): Promise<T | null> {
    const items = await this.findAll();
    return items.find((i) => i.id === id) ?? null;
  }

  async create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const now = new Date().toISOString();
    const entity = { ...data, id: generateId(), created_at: now, updated_at: now } as T;

    await this.client.spreadsheets.values.append({
      spreadsheetId: this.table.spreadsheetId,
      range: this.range,
      valueInputOption: "RAW",
      requestBody: {
        values: [objectToRow(this.table.columns, entity as unknown as Record<string, unknown>)],
      },
    });

    invalidateCache(this.table);
    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const rows = await this.readAllRows();
    const [headerRow, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex((r) => r[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Record dengan id "${id}" tidak ditemukan di ${this.table.sheetName}`);
    }

    const existing = rowToObject<T>(this.table.columns, dataRows[rowIndex]!);

    // PENTING: buang key yang nilainya `undefined` dari `data` sebelum
    // digabung ke `existing`. Tanpa ini, field yang tidak dikirim tapi
    // tetap "ada" sebagai key (mis. dari objek literal manual, atau dari
    // hasil parsing Zod untuk field optional yang tidak diisi) akan
    // menimpa nilai lama menjadi kosong lewat object spread — walau
    // caller cuma bermaksud mengubah satu field saja (contoh nyata: klik
    // tombol Aktifkan/Nonaktifkan user yang cuma mengirim { status },
    // tapi name/email/role ikut hilang).
    const cleanData = Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(([, v]) => v !== undefined)
    ) as Partial<T>;

    const updated = {
      ...existing,
      ...cleanData,
      updated_at: new Date().toISOString(),
    } as T;

    const sheetRowNumber = rowIndex + 2; // +1 header, +1 karena index mulai 0
    await this.client.spreadsheets.values.update({
      spreadsheetId: this.table.spreadsheetId,
      range: `${this.table.sheetName}!A${sheetRowNumber}:${this.columnLetter(
        this.table.columns.length
      )}${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [objectToRow(this.table.columns, updated as unknown as Record<string, unknown>)],
      },
    });

    invalidateCache(this.table);
    return updated;
  }

  /** Soft delete: master data tidak pernah dihapus fisik, hanya dinonaktifkan. */
  async softDelete(id: string): Promise<void> {
    await this.update(id, { status: "inactive" } as unknown as Partial<T>);
  }

  /**
   * Hard delete — mengosongkan baris (bukan menghapus baris fisik, agar
   * nomor baris entitas lain tidak bergeser). `findAll` melewati baris
   * kosong lewat pengecekan `r[0]` yang falsy. Lihat pembatasan pemakaian
   * di komentar interface Repository.
   */
  async remove(id: string): Promise<void> {
    const rows = await this.readAllRows();
    const [, ...dataRows] = rows;
    const rowIndex = dataRows.findIndex((r) => r[0] === id);
    if (rowIndex === -1) return;

    const sheetRowNumber = rowIndex + 2;
    await this.client.spreadsheets.values.update({
      spreadsheetId: this.table.spreadsheetId,
      range: `${this.table.sheetName}!A${sheetRowNumber}:${this.columnLetter(
        this.table.columns.length
      )}${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [this.table.columns.map(() => "")] },
    });

    invalidateCache(this.table);
  }
}
