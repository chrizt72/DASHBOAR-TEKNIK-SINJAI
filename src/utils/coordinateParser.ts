/**
 * Robust parser for geographical coordinates in various formats found in Indonesian PLN spreadsheets:
 * 1. Decimal with degree symbols: "5.101061°S, 120.225540°E", "5.254496°S, 120.117371°E"
 * 2. Comma decimals: "5,12025 120,2306E", "5,2095625 120,251003E", "5,200097S 120,262905E"
 * 3. Degrees, Minutes, Seconds (DMS): "5°11'11,196\"S 120°16'43,038\"E" or "5°13'58\"S 120°10'14\"E"
 * 4. Indonesian Direction labels: "5°16'15.8\"LS 120°06'25.6\"BT" (LS = Lintang Selatan, BT = Bujur Timur)
 * 5. Decimal coordinate pairs: "5.172133695 120.22488254E" or "-5.12345, 120.2345"
 * 6. Village-approximate coordinates fallback if only village name/plus code is available
 */

export interface ParsedCoordinate {
  lat: number;
  lng: number;
}

// Approximate center coordinates for Sinjai villages/desas as a fallback for incomplete GPS readings
const VILLAGE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'SUKAMAJU': { lat: -5.2650, lng: 120.1820 },
  'LAMATTI RILAU': { lat: -5.1010, lng: 120.2255 },
  'LAMATTI RIATTANG': { lat: -5.1017, lng: 120.1527 },
  'ALEHANUAE': { lat: -5.1180, lng: 120.2310 },
  'PATTALASSANG': { lat: -5.2030, lng: 120.2550 },
  'PASIMARANNU': { lat: -5.1840, lng: 120.2760 },
  'SALOHE': { lat: -5.1721, lng: 120.2248 },
  'SANJAI': { lat: -5.2220, lng: 120.3010 },
  'SAUKANG': { lat: -5.1499, lng: 120.2426 },
  'ALENANGKA': { lat: -5.2300, lng: 120.1700 },
  'GARECCING': { lat: -5.2194, lng: 120.1691 },
  'ASKA': { lat: -5.2041, lng: 120.1778 },
  'SANGIASSERI': { lat: -5.2750, lng: 120.1470 },
  'PALANGKA': { lat: -5.2940, lng: 120.1310 },
  'PUNCAK': { lat: -5.2710, lng: 120.1071 },
  'SONGING': { lat: -5.2545, lng: 120.1173 },
  'SAOTENGAH': { lat: -5.2849, lng: 120.1832 },
  'MASSAILE': { lat: -5.2314, lng: 120.2115 },
  'SAMATURUE': { lat: -5.2635, lng: 120.1682 },
  'KALOBBA': { lat: -5.2920, lng: 120.1710 },
};

export function parseCoordinate(coordStr: any, villageName?: string): ParsedCoordinate | null {
  if (!coordStr || typeof coordStr !== 'string') {
    return getVillageFallback(villageName);
  }
  const raw = coordStr.trim();
  if (!raw || raw === '-' || raw === '#N/A' || raw === 'NaN') {
    return getVillageFallback(villageName);
  }

  try {
    // 1. Helper to convert DMS into decimal degrees
    const dmsToDec = (degStr: string, minStr: string, secStr: string, dir?: string): number => {
      const d = parseFloat(degStr) || 0;
      const m = parseFloat(minStr) || 0;
      const s = parseFloat(secStr.replace(',', '.')) || 0;
      let dec = d + m / 60 + s / 3600;
      const dUpper = (dir || '').toUpperCase();
      if (dUpper.includes('S') || dUpper.includes('LS')) {
        dec = -Math.abs(dec);
      }
      return dec;
    };

    // 2. Try DMS pattern: e.g. 5°11'11,196"S 120°16'43,038"E  or  5°16'15.8"LS 120°06'25.6"BT  or  5°13'58"S 120°10'14"E
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*['`′]\s*([\d.,]+)?\s*["″]?\s*(S|LS|N|LU)?\s*[,/ ]+\s*(\d+)\s*°\s*(\d+)\s*['`′]\s*([\d.,]+)?\s*["″]?\s*(E|BT|W|BB)?/i;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) {
      const lat = dmsToDec(dmsMatch[1], dmsMatch[2], dmsMatch[3] || '0', dmsMatch[4] || 'S');
      const lng = dmsToDec(dmsMatch[5], dmsMatch[6], dmsMatch[7] || '0', dmsMatch[8] || 'E');
      if (isValidSinjaiCoords(lat, lng)) {
        return { lat: lat > 0 ? -lat : lat, lng };
      }
    }

    // 3. Try decimal pattern: "5.101061°S, 120.225540°E", "5,12025 120,2306E", "5.172133695 120.22488254E"
    const cleaned = raw.replace(/[°"″'`′]/g, ' ').replace(/\s+/g, ' ').trim();
    const decRegex = /([+-]?\d+(?:[.,]\d+)?)\s*(S|LS|N|LU)?\s*[,/ ]+\s*([+-]?\d+(?:[.,]\d+)?)\s*(E|BT|W|BB)?/i;
    const decMatch = cleaned.match(decRegex);
    if (decMatch) {
      let lat = parseFloat(decMatch[1].replace(',', '.'));
      let lng = parseFloat(decMatch[3].replace(',', '.'));
      const latDir = (decMatch[2] || '').toUpperCase();
      const rawUpper = raw.toUpperCase();

      if (lat > 0 && (latDir.includes('S') || latDir.includes('LS') || rawUpper.includes('S') || rawUpper.includes('LS') || lat < 10)) {
        lat = -Math.abs(lat);
      }

      if (isValidSinjaiCoords(lat, lng)) {
        return { lat, lng };
      }
    }

    // 4. Try standard comma or space separated pair
    const parts = raw.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      let lat = parseFloat(parts[0].replace(',', '.'));
      let lng = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(lat) && !isNaN(lng)) {
        if (lat > 0 && lat < 10) lat = -Math.abs(lat);
        if (isValidSinjaiCoords(lat, lng)) {
          return { lat, lng };
        }
      }
    }
  } catch (e) {
    console.warn('Error parsing coordinate:', coordStr, e);
  }

  return getVillageFallback(villageName);
}

function getVillageFallback(villageName?: string): ParsedCoordinate | null {
  if (!villageName) return null;
  const normalized = villageName.trim().toUpperCase();
  for (const [key, coords] of Object.entries(VILLAGE_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // Add slight jitter so overlapping points in the same village don't completely cover each other
      const jitterLat = (Math.random() - 0.5) * 0.003;
      const jitterLng = (Math.random() - 0.5) * 0.003;
      return {
        lat: coords.lat + jitterLat,
        lng: coords.lng + jitterLng,
      };
    }
  }
  return null;
}

function isValidSinjaiCoords(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -8 && lat <= -3 && lng >= 118 && lng <= 123;
}
