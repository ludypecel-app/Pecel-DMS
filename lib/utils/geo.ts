/**
 * Menghitung jarak antara dua titik koordinat (lat/lng) memakai rumus
 * Haversine, hasil dalam meter. Dipakai untuk validasi "soft" jarak
 * check-in sales terhadap titik koordinat Warung di master data.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // radius bumi rata-rata, meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/** Radius toleransi check-in terhadap koordinat Warung (meter). */
export const CHECK_IN_RADIUS_METERS = 50;
