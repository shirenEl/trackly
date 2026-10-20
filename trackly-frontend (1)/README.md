# Trackly Frontend

Frontend React + Vite dengan tampilan putih minimalis untuk backend Express + TypeScript.

## Menjalankan
1. Ekstrak folder ini.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan `VITE_API_URL`.
4. Jalankan `npm run dev`.

## Catatan integrasi API
Frontend menggunakan endpoint default berikut:
- `POST /auth/login`
- `POST /auth/register`
- `GET /movies`
- `GET /series`
- `GET /novels`
- `GET /library`

Nama endpoint dan bentuk respons backend kamu belum diperiksa dari file route, jadi sesuaikan `src/api.js` dengan route yang benar. Frontend mencoba membaca respons berupa array atau `{ data: [...] }` / `{ items: [...] }`.
JWT disimpan di localStorage. Untuk produksi, pertimbangkan cookie HttpOnly yang dikelola backend.
