import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  MapPin,
  Compass,
  Phone,
  Layers,
  RotateCcw,
  Navigation,
  ExternalLink,
  Info,
  CheckCircle2,
  Building2,
  ListFilter,
  X,
  Zap,
  Radio,
  ShieldAlert,
  Upload,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { KandangAyamItem } from '../types';
import {
  PRECONFIGURED_KML_LAYERS,
  loadKmlLayerData,
  parseKmlStringToGeoJson,
  KmlLayerConfig,
} from '../services/kmlService';
import type { FeatureCollection } from 'geojson';

interface KandangAyamMapProps {
  data: KandangAyamItem[];
  lastUpdated?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Sinjai regional center coordinates
const SINJAI_CENTER: [number, number] = [-5.225, 120.2];
const DEFAULT_ZOOM = 12;

// Google Maps & Complementary Tile Layers configurations
const MAP_LAYERS = {
  google_streets: {
    name: 'Google Maps (Peta Standar)',
    shortName: 'Peta',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps',
    isGoogle: true,
  },
  google_hybrid: {
    name: 'Google Maps (Satelit Hybrid)',
    shortName: 'Satelit',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps & Satellite Imagery',
    isGoogle: true,
  },
  google_terrain: {
    name: 'Google Maps (Medan / Relief)',
    shortName: 'Medan',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
    isGoogle: true,
  },
  google_traffic: {
    name: 'Google Maps (Lalu Lintas)',
    shortName: 'Trafik',
    url: 'https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps',
    isGoogle: true,
  },
  dark: {
    name: 'Dark Theme (CartoDB)',
    shortName: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO',
    isGoogle: false,
  },
};

// Create authentic Google Maps style Red & Blue Teardrop Pin Markers with shadow
function createGooglePinIcon(isSelected: boolean, label: string, isAyam: boolean = true) {
  const pinColor = isSelected ? '#1a73e8' : '#ea4335';
  const pinDarkColor = isSelected ? '#1557b0' : '#b31412';
  const pinSize = isSelected ? 44 : 36;
  const height = isSelected ? 52 : 44;

  const html = `
    <div class="google-pin-container" style="position: relative; width: ${pinSize}px; height: ${height}px; cursor: pointer;">
      <!-- Pin Ground Shadow -->
      <div style="position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); width: ${
        pinSize * 0.55
      }px; height: 7px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(2px);"></div>
      
      <!-- Animated Pulse Ring when selected -->
      ${
        isSelected
          ? `<div style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%; background: rgba(26, 115, 232, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ''
      }

      <!-- Authentic Google Teardrop SVG Pin -->
      <svg viewBox="0 0 384 512" style="position: absolute; top: 0; left: 0; width: ${pinSize}px; height: ${height}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); transition: transform 0.2s ease;">
        <defs>
          <linearGradient id="pinGrad-${isSelected ? 'sel' : 'def'}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${pinColor}" />
            <stop offset="100%" stop-color="${pinDarkColor}" />
          </linearGradient>
        </defs>
        <!-- Pin Body -->
        <path fill="url(#pinGrad-${isSelected ? 'sel' : 'def'})" stroke="#ffffff" stroke-width="12" d="M192 0C85.96 0 0 85.96 0 192c0 77.4 55.4 142.9 128 178.6V480c0 17.7 14.3 32 32 32s32-14.3 32-32v-109.4c72.6-35.7 128-101.2 128-178.6C384 85.96 298 0 192 0z"/>
        <!-- Inner White Circle -->
        <circle cx="192" cy="192" r="95" fill="#ffffff" />
        <!-- Inner Icon / Label -->
        <text x="192" y="212" font-size="100" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" fill="${pinDarkColor}" text-anchor="middle">
          ${label.substring(0, 2)}
        </text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'google-maps-pin',
    iconSize: [pinSize, height],
    iconAnchor: [pinSize / 2, height - 2],
    popupAnchor: [0, -(height - 4)],
  });
}

// Controller component to zoom and pan the map dynamically
function MapController({
  targetLocation,
  zoomLevel,
}: {
  targetLocation: [number, number] | null;
  zoomLevel: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation && !isNaN(targetLocation[0]) && !isNaN(targetLocation[1])) {
      map.flyTo(targetLocation, zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [targetLocation, zoomLevel, map]);

  return null;
}

// Inner Map Sub-component for Google Maps styled Zoom & Street View Controls
function GoogleMapCustomControls({
  onResetView,
}: {
  onResetView: () => void;
}) {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleOpenStreetView = () => {
    const center = map.getCenter();
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="absolute bottom-6 right-3 z-[400] flex flex-col items-center space-y-2 pointer-events-auto">
      {/* Google Maps Street View Pegman Button */}
      <button
        type="button"
        onClick={handleOpenStreetView}
        title="Buka Google Street View di area ini"
        className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all hover:scale-105 group"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-amber-500 group-hover:scale-110 transition-transform">
          <path d="M12 2C9.24 2 7 4.24 7 7c0 2.21 1.44 4.08 3.45 4.73C8.42 12.8 7 15.22 7 18v4h3v-4c0-1.1.9-2 2-2s2 .9 2 2v4h3v-4c0-2.78-1.42-5.2-3.45-6.27C15.56 11.08 17 9.21 17 7c0-2.76-2.24-5-5-5zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
        </svg>
      </button>

      {/* Google Maps My Location Center Button */}
      <button
        type="button"
        onClick={onResetView}
        title="Pusatkan Peta ke Sinjai"
        className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all hover:scale-105"
      >
        <Compass className="w-5 h-5 text-blue-600" />
      </button>

      {/* Google Maps Zoom +/- Buttons Container */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200/80 overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Perbesar (Zoom In)"
          className="w-10 h-10 hover:bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center border-b border-slate-100 transition-colors"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Perkecil (Zoom Out)"
          className="w-10 h-10 hover:bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center transition-colors"
        >
          −
        </button>
      </div>
    </div>
  );
}

export const KandangAyamMap: React.FC<KandangAyamMapProps> = ({
  data,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState('ALL');
  const [selectedKandang, setSelectedKandang] = useState<KandangAyamItem | null>(null);
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState(DEFAULT_ZOOM);
  const [activeLayer, setActiveLayer] = useState<keyof typeof MAP_LAYERS>('google_streets');
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const [showKmlSelector, setShowKmlSelector] = useState(false);
  const [showSidebarList, setShowSidebarList] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // KML Layers State
  const [kmlLayers, setKmlLayers] = useState<{
    config: KmlLayerConfig;
    geoJson: FeatureCollection | null;
    visible: boolean;
    loading: boolean;
  }[]>(() =>
    PRECONFIGURED_KML_LAYERS.map(cfg => ({
      config: cfg,
      geoJson: null,
      visible: cfg.defaultVisible,
      loading: true,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load KML layers data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadAllKml() {
      const updated = await Promise.all(
        PRECONFIGURED_KML_LAYERS.map(async cfg => {
          const geoJson = await loadKmlLayerData(cfg);
          return {
            config: {
              ...cfg,
              featureCount: geoJson?.features?.length || 0,
            },
            geoJson,
            visible: cfg.defaultVisible,
            loading: false,
          };
        })
      );

      if (isMounted) {
        setKmlLayers(updated);
      }
    }

    loadAllKml();

    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle KML Layer visibility
  const toggleKmlLayer = (layerId: string) => {
    setKmlLayers(prev =>
      prev.map(l => (l.config.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  // Toggle All KML layers
  const toggleAllKml = (visible: boolean) => {
    setKmlLayers(prev => prev.map(l => ({ ...l, visible })));
  };

  // Handle custom KML file upload using @tmcw/togeojson
  const handleCustomKmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = parseKmlStringToGeoJson(text);
        const newLayer: KmlLayerConfig = {
          id: `custom-kml-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          filename: file.name,
          driveUrl: '',
          color: '#10b981', // emerald
          secondaryColor: '#059669',
          type: 'custom',
          defaultVisible: true,
          featureCount: parsed.features?.length || 0,
          description: `Layer KML kustom diunggah pengguna (${parsed.features?.length || 0} fitur)`,
        };

        setKmlLayers(prev => [
          ...prev,
          {
            config: newLayer,
            geoJson: parsed,
            visible: true,
            loading: false,
          },
        ]);
      } catch (err) {
        console.error('Failed to parse uploaded KML file:', err);
      }
    };
    reader.readAsText(file);
  };

  // Extract unique Kecamatans
  const kecamatanList = useMemo(() => {
    const list = Array.from(new Set(data.map(d => d.kecamatan).filter(Boolean)));
    return ['ALL', ...list];
  }, [data]);

  // Filtered kandang list based on search and kecamatan filter
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchKecamatan =
        selectedKecamatan === 'ALL' ||
        item.kecamatan.toLowerCase() === selectedKecamatan.toLowerCase();

      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchKecamatan;

      const matchName = item.namaPeternak.toLowerCase().includes(term);
      const matchDesa = item.desaKelurahan.toLowerCase().includes(term);
      const matchKec = item.kecamatan.toLowerCase().includes(term);
      const matchPhone = item.noHp.includes(term);

      return matchKecamatan && (matchName || matchDesa || matchKec || matchPhone);
    });
  }, [data, searchTerm, selectedKecamatan]);

  // Autocomplete suggestions (top 6 matches)
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return data
      .filter(item => {
        return (
          item.namaPeternak.toLowerCase().includes(term) ||
          item.desaKelurahan.toLowerCase().includes(term) ||
          item.kecamatan.toLowerCase().includes(term)
        );
      })
      .slice(0, 6);
  }, [data, searchTerm]);

  // Points with valid coordinates for map markers
  const mappedPoints = useMemo(() => {
    return filteredData.filter(
      item => item.lat !== null && item.lng !== null && !isNaN(item.lat) && !isNaN(item.lng)
    ) as (KandangAyamItem & { lat: number; lng: number })[];
  }, [filteredData]);

  // Handle selecting / zooming to a specific kandang ayam
  const handleSelectKandang = (item: KandangAyamItem) => {
    setSelectedKandang(item);
    if (item.lat !== null && item.lng !== null) {
      setMapTarget([item.lat, item.lng]);
      setTargetZoom(16); // High zoom on exact location
    }
  };

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // If exact or single match found while typing, auto-focus map
    const term = value.trim().toLowerCase();
    if (term.length >= 3) {
      const exactMatch = data.find(
        d =>
          d.namaPeternak.toLowerCase() === term ||
          d.namaPeternak.toLowerCase().startsWith(term)
      );
      if (exactMatch && exactMatch.lat !== null && exactMatch.lng !== null) {
        setSelectedKandang(exactMatch);
        setMapTarget([exactMatch.lat, exactMatch.lng]);
        setTargetZoom(16);
      }
    }
  };

  // Handle resetting map to full Sinjai view
  const handleResetMap = () => {
    setSearchTerm('');
    setSelectedKandang(null);
    setMapTarget(SINJAI_CENTER);
    setTargetZoom(DEFAULT_ZOOM);
  };

  // Quick stats calculation
  const totalCount = data.length;
  const mappedCount = data.filter(d => d.hasValidCoordinate).length;
  const unmappedCount = totalCount - mappedCount;

  // Active KML layer counts
  const totalActiveKmlFeatures = kmlLayers
    .filter(l => l.visible && l.geoJson)
    .reduce((acc, l) => acc + (l.geoJson?.features?.length || 0), 0);

  return (
    <div id="section-kandang-ayam" className="space-y-4">
      {/* Header & Controls Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Section Title & Metrics */}
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 font-mono">
                  PELANGGAN KD AYAM & JARINGAN LISTRIK KML
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live GIS
                  </span>
                </h2>
              </div>
            </div>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center space-x-2">
              <span className="text-slate-500">Kandang:</span>
              <span className="font-bold text-amber-700">{totalCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs font-mono flex items-center space-x-2 text-cyan-800">
              <Zap className="w-3.5 h-3.5 text-cyan-600" />
              <span>{totalActiveKmlFeatures} Aset KML Aktif</span>
            </div>
            {onRefresh && (
              <button
                id="refresh-kandang-map-btn"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
                title="Perbarui Data"
              >
                <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Kecamatan Filter Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input with Auto-Zoom */}
          <div className="relative md:col-span-6 lg:col-span-7">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-cyan-600 pointer-events-none" />
              <input
                id="search-kandang-input"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                placeholder="Cari peternak ayam (cth: M Ali, Tiar, Ramli, Sanjai, Sukamaju)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedKandang(null);
                  }}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Autocomplete Suggestions Dropdown */}
            {isSearchFocused && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Hasil Pencarian Cepat ({searchSuggestions.length})
                </div>
                {searchSuggestions.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSearchTerm(item.namaPeternak);
                      handleSelectKandang(item);
                      setIsSearchFocused(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        {item.namaPeternak}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.desaKelurahan}, Kec. {item.kecamatan}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Zoom Peta
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter by Kecamatan Dropdown */}
          <div className="md:col-span-3 lg:col-span-3">
            <div className="relative">
              <select
                id="filter-kandang-kecamatan"
                value={selectedKecamatan}
                onChange={e => setSelectedKecamatan(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 text-slate-800 text-xs rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer"
              >
                {kecamatanList.map(kec => (
                  <option key={kec} value={kec}>
                    {kec === 'ALL' ? 'Semua Kecamatan' : `Kec. ${kec}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Map View Button */}
          <div className="md:col-span-3 lg:col-span-2 flex items-center space-x-2">
            <button
              id="reset-kandang-map-view"
              onClick={handleResetMap}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition-all hover:border-cyan-400"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-600" />
              <span>Reset Peta</span>
            </button>
          </div>
        </div>

        {/* KML Layer Fast Toggle Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              Lapisan KML Jaringan:
            </span>

            {kmlLayers.map(l => (
              <button
                key={l.config.id}
                onClick={() => toggleKmlLayer(l.config.id)}
                className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  l.visible
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-800 shadow-xs ring-1 ring-cyan-200'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: l.visible ? l.config.color : '#94a3b8' }}
                />
                <span>{l.config.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({l.config.featureCount || 0})
                </span>
                {l.visible ? <Eye className="w-3 h-3 text-cyan-600" /> : <EyeOff className="w-3 h-3" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => toggleAllKml(true)}
              className="text-[10px] font-mono text-cyan-700 hover:underline px-2 py-1 font-bold"
            >
              Aktifkan Semua
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => toggleAllKml(false)}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Sembunyikan KML
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 transition-colors font-bold"
              title="Unggah file .kml lokal untuk ditampilkan di peta"
            >
              <Upload className="w-3 h-3 text-emerald-600" />
              <span>+ Unggah KML</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".kml,.xml"
              onChange={handleCustomKmlUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Map & Side Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left/Main Column: Leaflet Interactive Map */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 min-h-[560px] h-[720px]">
          {/* Top-Left: Google Maps Type Switcher Pill (Peta / Satelit / Medan / Trafik) */}
          <div className="absolute top-3 left-3 z-[400] flex items-center shadow-lg rounded-lg overflow-hidden bg-white border border-slate-300 pointer-events-auto">
            <button
              type="button"
              onClick={() => setActiveLayer('google_streets')}
              className={`px-3.5 py-2 text-xs font-semibold font-sans transition-all flex items-center space-x-1 ${
                activeLayer === 'google_streets'
                  ? 'bg-blue-600 text-white font-bold shadow-inner'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Peta</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('google_hybrid')}
              className={`px-3.5 py-2 text-xs font-semibold font-sans border-l border-slate-200 transition-all flex items-center space-x-1 ${
                activeLayer === 'google_hybrid'
                  ? 'bg-blue-600 text-white font-bold shadow-inner'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Satelit</span>
            </button>

            {/* Dropdown for Terrain, Traffic, Dark */}
            <div className="relative border-l border-slate-200">
              <button
                type="button"
                onClick={() => setShowLayerSelector(!showLayerSelector)}
                title="Pilihan Tipe Peta Google Lainnya"
                className={`px-2.5 py-2 text-xs transition-colors flex items-center ${
                  activeLayer !== 'google_streets' && activeLayer !== 'google_hybrid'
                    ? 'bg-blue-100 text-blue-800 font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="ml-1 text-[11px]">Lainnya</span>
              </button>

              {showLayerSelector && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden py-1 z-50 divide-y divide-slate-100 font-sans">
                  {(Object.keys(MAP_LAYERS) as (keyof typeof MAP_LAYERS)[]).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveLayer(key);
                        setShowLayerSelector(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between ${
                        activeLayer === key
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{MAP_LAYERS[key].name}</span>
                      {activeLayer === key && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top-Right: Mobile Sidebar Toggle & Quick KML Legend Indicator */}
          <div className="absolute top-3 right-3 z-[400] flex items-center space-x-2 pointer-events-auto">
            {/* Quick KML Status Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-md rounded-lg shadow border border-slate-200 text-[11px] font-sans text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">Google Maps Live GIS</span>
            </div>

            {/* Toggle Drawer on Mobile */}
            <button
              onClick={() => setShowSidebarList(!showSidebarList)}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold shadow flex items-center space-x-1.5"
            >
              <ListFilter className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar ({filteredData.length})</span>
            </button>
          </div>

          {/* Google Maps Bottom-Left Watermark & Attribution */}
          <div className="absolute bottom-2 left-3 z-[400] flex items-center space-x-2 pointer-events-none select-none">
            {/* Google Logo */}
            <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded shadow-sm border border-slate-200/80 flex items-center space-x-1">
              <span className="font-black text-sm tracking-tighter" style={{ fontFamily: 'Product Sans, Roboto, sans-serif' }}>
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              <span className="text-[10px] text-slate-500 font-sans font-medium">Maps</span>
            </div>
            <div className="hidden md:block text-[10px] text-slate-600 bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
              Data spasial &copy;2026 Google | PLN Sinjai
            </div>
          </div>

          {/* Leaflet Map Container configured to render Google Maps */}
          <MapContainer
            center={SINJAI_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%', backgroundColor: '#e5e3df' }}
            attributionControl={false}
            zoomControl={false}
          >
            {/* Dynamic Map Controller for Zoom / Pan */}
            <MapController
              targetLocation={mapTarget}
              zoomLevel={targetZoom}
            />

            {/* Custom Google Maps Style Zoom & Street View Controls */}
            <GoogleMapCustomControls onResetView={handleResetMap} />

            {/* Tile Layer (Google Streets / Satellite Hybrid / Terrain) */}
            <TileLayer
              url={MAP_LAYERS[activeLayer].url}
              subdomains={MAP_LAYERS[activeLayer].subdomains}
              maxZoom={MAP_LAYERS[activeLayer].maxZoom}
              attribution={MAP_LAYERS[activeLayer].attribution}
            />

            {/* Render KML GeoJSON Layers (Feeder JTM, Keypoint, FCO) */}
            {kmlLayers.map(l => {
              if (!l.visible || !l.geoJson) return null;

              return (
                <GeoJSON
                  key={`${l.config.id}-${l.geoJson.features?.length}`}
                  data={l.geoJson}
                  style={feature => {
                    const strokeColor =
                      feature?.properties?.stroke || l.config.color || '#06b6d4';
                    return {
                      color: strokeColor,
                      weight: 3.5,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round',
                    };
                  }}
                  pointToLayer={(feature, latlng) => {
                    const name = feature?.properties?.name || 'Aset PLN';
                    const isKeypoint = l.config.type === 'keypoint';
                    const isFco = l.config.type === 'fco';

                    const badgeText = isKeypoint ? 'KP' : isFco ? 'FCO' : 'PLN';
                    const badgeBg = isKeypoint ? '#ef4444' : isFco ? '#9333ea' : '#059669';

                    const html = `
                      <div class="flex items-center justify-center rounded-md text-white font-mono text-[8px] font-black shadow-md border border-white cursor-pointer transition-transform hover:scale-125"
                        style="width: 22px; height: 22px; background-color: ${badgeBg};"
                        title="${name}"
                      >
                        ${badgeText}
                      </div>
                    `;

                    return L.marker(latlng, {
                      icon: L.divIcon({
                        html,
                        className: 'kml-point-marker',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11],
                        popupAnchor: [0, -11],
                      }),
                    });
                  }}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties || {};
                    const title = props.name || props.NAMA_P_JAR || props.P_EAM || 'Aset Distribusi PLN';
                    const desc = props.description || '';
                    const size = props.SIZE || props.JENIS || '';
                    const length = props.PANJANG || props.LENGTH || '';
                    const assetNo = props.NO_ASSET || '';
                    const keypoint = props.KEYPOINT || '';

                    const popupContent = `
                      <div class="p-3 bg-white text-slate-800 rounded-xl font-sans text-xs min-w-[220px] max-w-[280px]">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                          <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            ${l.config.name.split(' ')[0]}
                          </span>
                          ${assetNo ? `<span class="text-[9px] font-mono text-slate-400">#${assetNo}</span>` : ''}
                        </div>
                        <h4 class="font-bold text-slate-900 text-sm mb-1">${title}</h4>
                        ${desc ? `<p class="text-[11px] text-slate-600 mb-1 leading-snug">${desc}</p>` : ''}
                        <div class="mt-2 space-y-0.5 text-[11px] font-mono">
                          ${size ? `<div class="text-emerald-700">⚡ Konduktor: <b>${size}</b></div>` : ''}
                          ${length ? `<div class="text-blue-700">📏 Panjang: <b>${length} kms</b></div>` : ''}
                          ${keypoint ? `<div class="text-amber-700">📍 Penyulang: <b>${keypoint}</b></div>` : ''}
                        </div>
                      </div>
                    `;
                    layer.bindPopup(popupContent);
                  }}
                />
              );
            })}

            {/* Google Maps Pin Markers for all Kandang Ayam */}
            {mappedPoints.map((item, idx) => {
              const isSelected = selectedKandang?.id === item.id;
              const initials = item.namaPeternak
                .split(' ')
                .slice(0, 2)
                .map(w => w[0])
                .join('')
                .toUpperCase() || `${idx + 1}`;

              const customIcon = createGooglePinIcon(isSelected, initials);

              return (
                <Marker
                  key={item.id}
                  position={[item.lat, item.lng]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => {
                      handleSelectKandang(item);
                    },
                  }}
                >
                  <Popup className="google-infowindow-popup">
                    <div className="p-3.5 bg-white text-slate-800 rounded-xl font-sans min-w-[240px] max-w-[290px]">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          🐔 Kandang #{item.no}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Kec. {item.kecamatan}
                        </span>
                      </div>

                      {/* Place Title */}
                      <h4 className="text-base font-bold text-slate-900 leading-snug mb-1">
                        {item.namaPeternak}
                      </h4>

                      {/* Sub-label Address */}
                      <p className="text-xs text-slate-600 mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span>Desa {item.desaKelurahan}, Kec. {item.kecamatan}</span>
                      </p>

                      {/* Phone Contact */}
                      {item.noHp && item.noHp !== '-' && (
                        <div className="text-xs text-slate-700 mb-2.5 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <a
                            href={`tel:${item.noHp}`}
                            className="font-mono text-emerald-700 font-semibold hover:underline"
                          >
                            {item.noHp}
                          </a>
                        </div>
                      )}

                      {/* Coordinates */}
                      <div className="p-1.5 bg-slate-50 rounded text-[10px] font-mono text-slate-500 mb-3 border border-slate-200 flex items-center justify-between">
                        <span>{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</span>
                        <span className="text-blue-600 font-bold">GPS OK</span>
                      </div>

                      {/* Action Buttons in authentic Google Maps Blue */}
                      <div className="space-y-1.5">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5 fill-white" />
                          <span>Petunjuk Arah (Directions)</span>
                        </a>

                        <div className="grid grid-cols-2 gap-1.5">
                          <a
                            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium text-center flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Street View</span>
                          </a>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium text-center flex items-center justify-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>G-Maps</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Selected Candidate Banner on Map */}
          {selectedKandang && (
            <div className="absolute bottom-4 left-4 right-4 z-[400] p-3.5 bg-white/95 border border-cyan-400 rounded-xl shadow-xl backdrop-blur-md text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center font-bold font-mono">
                  #{selectedKandang.no}
                </div>
                <div>
                  <div className="text-xs text-cyan-800 font-mono font-bold">
                    Kec. {selectedKandang.kecamatan} • Desa {selectedKandang.desaKelurahan}
                  </div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {selectedKandang.namaPeternak}
                    {selectedKandang.noHp && selectedKandang.noHp !== '-' && (
                      <span className="text-[11px] font-mono font-normal text-emerald-700 font-bold">
                        ({selectedKandang.noHp})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {selectedKandang.lat !== null && selectedKandang.lng !== null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedKandang.lat},${selectedKandang.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Petunjuk Arah</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedKandang(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border border-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Searchable List & Details Drawer */}
        <div className={`lg:col-span-4 space-y-3 ${showSidebarList ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col h-[720px]">
            {/* List Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-tight">
                  Daftar Peternak ({filteredData.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                {selectedKecamatan === 'ALL' ? 'Semua Wilayah' : selectedKecamatan}
              </span>
            </div>

            {/* Scrollable List Items */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {filteredData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  Tidak ditemukan data kandang ayam sesuai kata kunci "{searchTerm}"
                </div>
              ) : (
                filteredData.map(item => {
                  const isSelected = selectedKandang?.id === item.id;
                  const hasGps = item.lat !== null && item.lng !== null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectKandang(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50 border-cyan-300 shadow-xs ring-1 ring-cyan-200'
                          : 'bg-slate-50/70 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-[10px] font-mono font-bold">
                            {item.no}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 hover:text-cyan-700 transition-colors">
                            {item.namaPeternak}
                          </h4>
                        </div>
                        {hasGps ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            GPS OK
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Desa
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-0.5 mb-2 pl-8">
                        <div>
                          Desa: <span className="text-slate-800 font-medium">{item.desaKelurahan}</span>
                        </div>
                        <div>
                          Kecamatan: <span className="text-slate-700">{item.kecamatan}</span>
                        </div>
                        {item.noHp && item.noHp !== '-' && (
                          <div className="text-emerald-700 font-mono text-[10px] font-bold flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {item.noHp}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1.5 pl-8 pt-1.5 border-t border-slate-200">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectKandang(item);
                          }}
                          className="py-1 px-2 rounded-lg bg-white hover:bg-cyan-600 hover:text-white text-slate-700 text-[10px] font-mono flex items-center gap-1 transition-colors border border-slate-200 shadow-xs"
                        >
                          <Compass className="w-3 h-3 text-cyan-600 group-hover:text-white" />
                          <span>Fokus Peta</span>
                        </button>

                        {hasGps && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="py-1 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center gap-1 transition-colors ml-auto border border-slate-200 shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-600" />
                            <span>G-Maps</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List Footer Note */}
            <div className="pt-3 border-t border-slate-100 mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Data Kandang Ayam</span>
              <span className="font-bold text-cyan-700">{mappedPoints.length} Titik Koordinat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

