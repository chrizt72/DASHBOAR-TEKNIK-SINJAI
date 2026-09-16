import { kml as toGeoJSONKml } from '@tmcw/togeojson';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

export interface KmlLayerConfig {
  id: string;
  name: string;
  filename: string;
  driveUrl: string;
  color: string;
  secondaryColor?: string;
  type: 'feeder' | 'keypoint' | 'fco' | 'custom';
  defaultVisible: boolean;
  featureCount?: number;
  description: string;
}

export const PRECONFIGURED_KML_LAYERS: KmlLayerConfig[] = [
  {
    id: 'layer-feeder',
    name: 'FEEDER SINJAI (Jaringan JTM)',
    filename: 'kml_layer_2.kml',
    driveUrl: 'https://drive.google.com/file/d/1E81MeYed18U3kMlh59d6Ke2ycrMB-HQ6/view?usp=drive_link',
    color: '#06b6d4', // Cyan
    secondaryColor: '#3b82f6',
    type: 'feeder',
    defaultVisible: true,
    description: 'Jalur Saluran Udara Tegangan Menengah (SUTM 20kV) & Segmen Penyulang PLN Sinjai',
  },
  {
    id: 'layer-keypoint',
    name: 'KEYPOINT SINJAI (LBS / Recloser)',
    filename: 'kml_layer_3.kml',
    driveUrl: 'https://drive.google.com/file/d/1E6xrxGOchdmaM-sSyK4f9BAefg_Uhi9P/view?usp=drive_link',
    color: '#ef4444', // Red
    secondaryColor: '#f97316',
    type: 'keypoint',
    defaultVisible: true,
    description: 'Titik Peralatan Manuver Jaringan (LBS, Recloser, Sectionalizer, DS)',
  },
  {
    id: 'layer-fco',
    name: 'FCO JARING SINJAI (Fuse Cut Out)',
    filename: 'kml_layer_1.kml',
    driveUrl: 'https://drive.google.com/file/d/1xjpTWizMwz33XkCHwsjPcFgLLoPoHSXs/view?usp=drive_link',
    color: '#a855f7', // Purple
    secondaryColor: '#ec4899',
    type: 'fco',
    defaultVisible: false,
    description: 'Titik Pengaman Jaringan Distribusi (Fuse Cut Out / Percabangan)',
  },
];

/**
 * Parses raw KML string into standard GeoJSON FeatureCollection using @tmcw/togeojson
 */
export function parseKmlStringToGeoJson(kmlString: string): FeatureCollection {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
  return toGeoJSONKml(xmlDoc) as FeatureCollection;
}

/**
 * Loads KML layer from public directory or fallback JSON
 */
export async function loadKmlLayerData(layer: KmlLayerConfig): Promise<FeatureCollection | null> {
  try {
    // 1. Try loading converted JSON first for maximum speed
    const jsonPath = `/kml/${layer.filename.replace('.kml', '.geojson.json')}`;
    const jsonRes = await fetch(jsonPath);
    if (jsonRes.ok) {
      const data = await jsonRes.json();
      return data as FeatureCollection;
    }
  } catch {
    // fallback to KML fetch
  }

  try {
    // 2. Fetch raw KML and parse with @tmcw/togeojson in browser
    const kmlPath = `/kml/${layer.filename}`;
    const res = await fetch(kmlPath);
    if (res.ok) {
      const text = await res.text();
      return parseKmlStringToGeoJson(text);
    }
  } catch (err) {
    console.error(`Failed to load KML layer ${layer.name}:`, err);
  }

  return null;
}
