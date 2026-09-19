// Kontrak Repository generik. Implementasi awal ("SheetsRepository")
// mengakses Google Sheets; implementasi masa depan (mis. PostgresRepository)
// tinggal memenuhi interface yang sama tanpa mengubah Service Layer atau UI.
//
// Belum diimplementasikan di Tahap 1 — akan diisi mulai Tahap 2 (Master Data)
// bersamaan dengan setup Google Sheets API & Service Account.

export interface Repository<T extends { id: string }> {
  findAll(filter?: Partial<T>): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  softDelete(id: string): Promise<void>;
  /**
   * Hard delete (mengosongkan baris). HANYA untuk kasus khusus di mana
   * data belum pernah dipakai transaksi lain — mis. mengganti daftar
   * OrderDetail selama pesanan masih berstatus Scheduling. Master data
   * dan entitas transaksional yang sudah berjalan HARUS pakai softDelete.
   */
  remove(id: string): Promise<void>;
}
