import * as XLSX from 'xlsx';
import { PenyulangBebanItem } from '../types';
import { Beban20kvSummary } from './beban20kvCalculator';

export function exportBeban20kvExcel(
  items: PenyulangBebanItem[],
  summary: Beban20kvSummary,
  selectedFeederName = 'Semua Penyulang'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap Tiap Penyulang / Keypoint
  const rekapRows = items.map((item, idx) => ({
    'No': idx + 1,
    'Penyulang / Keypoint': item.keypoint,
    'Induk Feeder': item.penyulangInduk,
    'Jumlah Gardu': item.totalGardu,
    'Total Beban (KV)': item.totalBebanKv,
    'Rata-rata Beban Gardu (KV)': item.avgBebanKv,
    'Total Daya Trafo (kVA)': item.totalKvaTrafo,
    'Rata-rata Pembebanan (%)': item.avgBebanPersen,
    'Beban Tertinggi Gardu (KV)': item.maxBebanKv,
    'Gardu Terberat': item.maxBebanGardu,
    'Jumlah Gardu Overload': item.overloadCount,
    'Jumlah Gardu Normal': item.normalCount,
    'Jumlah Gardu Underload': item.underloadCount,
    'Status Dominan': item.statusBebanDominan,
  }));

  const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Beban 20kV');

  // Sheet 2: Detail Semua Gardu
  const detailRows: any[] = [];
  let noUrut = 1;
  items.forEach(item => {
    item.garduList.forEach(g => {
      detailRows.push({
        'No': noUrut++,
        'Penyulang / Keypoint': item.keypoint,
        'Induk Penyulang': g.penyulang || item.penyulangInduk,
        'Kode / Nama Gardu': g.nama,
        'Nama Gardu MAIP': g.namaGdMaip || '-',
        'Beban (KV)': g.bebanKv,
        'Beban (%)': g.bebanPersen,
        'Daya Trafo (kVA)': g.kvaTrafo,
        'Status Beban': g.statusBeban,
        'Fasa': g.fasaTrafo,
        'Konstruksi': g.konstruksi || '-',
        'Alamat / Lokasi': g.alamat || '-',
        'Jurusan': g.jurusan || '-',
        'PIC': g.pic || '-',
      });
    });
  });

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Gardu 20kV');

  // Sheet 3: Ringkasan Eksekutif
  const ringkasanRows = [
    { 'Parameter': 'Judul Laporan', 'Nilai': 'Laporan Beban 20kV Tiap Penyulang ULP Sinjai' },
    { 'Parameter': 'Kategori', 'Nilai': 'Rekapitulasi Pembebanan Sistem Distribusi' },
    { 'Parameter': 'Filter Feeder', 'Nilai': selectedFeederName },
    { 'Parameter': 'Tanggal Export', 'Nilai': new Date().toLocaleString('id-ID') },
    { 'Parameter': 'Total Akumulasi Beban 20kV', 'Nilai': `${summary.totalBebanKv.toLocaleString('id-ID')} KV` },
    { 'Parameter': 'Total Gardu Distribusi', 'Nilai': `${summary.totalGardu.toLocaleString('id-ID')} unit` },
    { 'Parameter': 'Total Kapasitas Trafo', 'Nilai': `${summary.totalKvaTrafo.toLocaleString('id-ID')} kVA` },
    { 'Parameter': 'Rata-rata Beban per Gardu', 'Nilai': `${summary.avgBebanKvPerGardu.toLocaleString('id-ID')} KV` },
    { 'Parameter': 'Rata-rata Persentase Beban', 'Nilai': `${summary.avgBebanPersen.toLocaleString('id-ID')}%` },
    { 'Parameter': 'Jumlah Keypoint / Penyulang', 'Nilai': `${summary.totalKeypoint} titik` },
    { 'Parameter': 'Penyulang Beban Tertinggi (Peak)', 'Nilai': `${summary.peakKeypoint} (${summary.peakKeypointBeban} KV)` },
    { 'Parameter': 'Gardu Overload (>80%)', 'Nilai': `${summary.totalOverloadGardu} unit` },
    { 'Parameter': 'Gardu Normal (20-80%)', 'Nilai': `${summary.totalNormalGardu} unit` },
    { 'Parameter': 'Gardu Underload (<20%)', 'Nilai': `${summary.totalUnderloadGardu} unit` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(ringkasanRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

  const fileName = `Laporan_Beban_20kV_ULP_Sinjai_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportBeban20kvCsv(items: PenyulangBebanItem[]) {
  const headers = [
    'No',
    'Penyulang / Keypoint',
    'Induk Feeder',
    'Jumlah Gardu',
    'Total Beban (KV)',
    'Rata-rata Beban (KV)',
    'Total Daya Trafo (kVA)',
    'Pembebanan Rata-rata (%)',
    'Beban Tertinggi Gardu (KV)',
    'Gardu Terberat',
    'Gardu Overload',
    'Status Dominan',
  ];

  const rows = items.map((item, idx) => [
    idx + 1,
    `"${item.keypoint.replace(/"/g, '""')}"`,
    `"${item.penyulangInduk.replace(/"/g, '""')}"`,
    item.totalGardu,
    item.totalBebanKv.toString().replace('.', ','),
    item.avgBebanKv.toString().replace('.', ','),
    item.totalKvaTrafo.toString().replace('.', ','),
    item.avgBebanPersen.toString().replace('.', ','),
    item.maxBebanKv.toString().replace('.', ','),
    `"${item.maxBebanGardu.replace(/"/g, '""')}"`,
    item.overloadCount,
    item.statusBebanDominan,
  ]);

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Beban_20kV_Penyulang_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
