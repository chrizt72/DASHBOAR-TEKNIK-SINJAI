# Panduan Publikasi Aplikasi Monitoring K3L PLN ULP Sinjai

Dokumentasi lengkap untuk mempublikasikan (deploy) aplikasi Monitoring K3L PLN ULP Sinjai.

---

## 1. Opsi A: Menggunakan Folder `dist/` (Langsung Publish / Tanpa Build Ulang)

Folder `dist/` berisi seluruh aset statis yang telah dikompilasi (HTML, JS bundle, CSS, file KML GIS, dan ikon).
Anda dapat langsung mengunggah isi folder `dist/` ke:
- **cPanel / Hosting Web / Apache / Nginx**: Cukup upload semua file di dalam folder `dist/` ke direktori `public_html` atau `www`.
- **Vercel / Netlify**: Tarik folder `dist/` atau hubungkan ke repository Git.
- **Firebase Hosting**: Jalankan `firebase deploy` dengan target folder `dist`.
- **GitHub Pages**: Buat branch `gh-pages` dari folder `dist/`.

---

## 2. Opsi B: Menjalankan / Membangun dari Source Code Lengkap

Jika Anda ingin memodifikasi kode atau menjalankan server pengembangan lokal:

### Prasyarat
- Node.js versi 18 atau lebih baru
- npm atau yarn

### Langkah Instalasi
1. Buka terminal di folder proyek
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan (mode lokal):
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`

4. Kompilasi ulang untuk publikasi produksi (Build):
   ```bash
   npm run build
   ```
   Hasil kompilasi siap publikasi akan diperbarui di folder `dist/`.

---

## 3. Fitur Utama Terintegrasi
- **Monitoring Survey Potensi K3**: 209 ID Survey dengan pemetaan koordinat utama & sekunder.
- **Monitoring Stiker & Rambu K3**: 382 ID Stiker dengan pelacakan titik lokasi dan jenis rambu.
- **Verifikasi Inspeksi CCV**: Evaluasi kepatuhan APD & SOP, leaderboard observer aktif.
- **Pemadaman Sosialisasi Desa**: 80 desa/kelurahan se-Sinjai (30 desa tersurvey vs 50 desa belum tersurvey).
- **Interaktif GIS**: Pemetaan satelit OpenStreetMap & visualisasi layer jaringan KML.
