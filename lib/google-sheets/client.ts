import "server-only";
import { google, sheets_v4 } from "googleapis";

let cachedClient: sheets_v4.Sheets | null = null;

/**
 * Mengembalikan singleton client Google Sheets API yang sudah diautentikasi
 * dengan Service Account. Import "server-only" mencegah modul ini
 * ter-bundle ke client — kredensial tidak pernah sampai ke browser.
 */
export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY belum diset di .env.local"
    );
  }

  // Private key dari .env biasanya menyimpan "\n" literal — perlu di-unescape.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}
