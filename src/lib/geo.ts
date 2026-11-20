/** La posizione pubblicata è sempre generalizzata (~1 km): mai l'indirizzo esatto. */
export const roundCoord = (value: number): number => Math.round(value * 100) / 100;

export function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocalizzazione non disponibile"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: roundCoord(pos.coords.latitude), lon: roundCoord(pos.coords.longitude) }),
      () => reject(new Error("Posizione non concessa")),
      { timeout: 8000 },
    );
  });
}

/** Raggio (km) che copre l'altezza visibile della mappa, per "Cerca in quest'area". */
export function radiusFromBounds(north: number, south: number, centerLat: number, east: number, west: number): number {
  const kmPerDeg = 111.32;
  const h = (north - south) * kmPerDeg;
  const w = (east - west) * kmPerDeg * Math.cos((centerLat * Math.PI) / 180);
  return Math.min(500, Math.max(1, Math.round(Math.max(h, w) / 2)));
}
