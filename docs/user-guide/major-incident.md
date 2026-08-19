# Major incident (induk–anak)

**Audience:** agent, team lead, SPV  
**Companion:** [Pengguna — desk](user-operator.md) · [Lead / SPV](lead-spv.md) · [Participant manual](participant-manual.md)  
**UI:** panel kanan di detail tiket. Chrome **ID** / **EN** mengikuti top bar.

Satu peristiwa besar sering muncul sebagai banyak tiket (cabang, kanal, requester). **Major incident** mengikat tiket itu ke **satu induk**, tanpa mengubah RCA.

Bukan Problem. Bukan katalog. Bukan eskalasi L2/L3.

---

## 1. RCA vs major

| | **Related problem (RCA)** | **Major incident** |
| --- | --- | --- |
| Kolom | `problem_id` | `parent_ticket_id` |
| Panel | **RCA / related problem** | **Major incident** |
| Induk | Tiket jenis **Problem** | Tiket jenis **Incident** |
| Anak | Incident yang berbagi akar masalah | Incident atau **Request** dari peristiwa yang sama |
| Contoh lab | *Backup gagal semalam* ↔ *AC ruang server panas* | Outage WAN: tiket cabang A + cabang B di bawah satu INC induk |
| Resolve massal | Tidak | Opsional: centang **Selesaikan juga tiket anak** saat resolve/close induk |

Jangan tautkan major ke tiket Problem. Jangan isi kedua panel untuk “mengganti” satu sama lain.

---

## 2. Aturan

- **Satu tingkat.** Anak tidak boleh punya anak. Induk tidak boleh menjadi anak.
- Induk harus **incident**. Anak: **incident** atau **request**. Problem dan Change tidak ikut.
- Induk yang sudah punya anak tidak boleh diubah jenisnya.
- Account yang sama (filter account di sidebar).
- Badge judul: **Major** pada induk, **Anak** pada child.

---

## 3. Tautkan dari induk

1. Buka incident yang jadi payung (prioritas biasanya high/critical).
2. Sidebar kanan → **Major incident**.
3. **Tautkan anak…** — pilih incident/request yang belum punya induk dan bukan induk orang lain.
4. Ulangi untuk tiket lain.

**Expected:** daftar anak muncul dengan nomor + status. Judul tiket induk menampilkan badge **Major**.

---

## 4. Tautkan dari anak

1. Buka incident atau request yang merupakan gejala (satu cabang, satu requester).
2. Panel **Major incident** → **Tiket induk** → pilih incident payung → **Simpan induk**.

**Expected:** tautan ke nomor induk. Badge **Anak**. Panel taut-anak di tiket ini hilang (sudah jadi child).

Lepas tautan: set induk ke **Tidak ada** / **None**, lalu simpan.

---

## 5. Selesaikan anak bersama induk

1. Di tiket **induk**, kartu **Update status** → `resolved` atau `closed`.
2. Centang **Selesaikan juga tiket anak yang masih terbuka**.
3. **Save status**.

Anak yang masih `open` / `in_progress` / `waiting` / `hold` menjadi `resolved`, dapat komentar *Resolved with major incident …*, dan tercatat di audit. Anak yang sudah resolved/closed tidak diubah.

Tanpa centang, hanya induk yang berubah. Process strip di atas **tidak** membawa opsi ini — pakai kartu status di kanan.

---

## 6. Kapan dipakai

| Pakai major | Jangan pakai major |
| --- | --- |
| Satu outage, banyak tiket masuk (cabang, kanal, portal) | Banyak incident karena **satu akar** yang masih diselidiki → Problem + RCA |
| Koordinasi war room: satu INC payung, sisanya child | Tiket Change / Problem |
| Close massal setelah layanan pulih | Hierarki lebih dari satu tingkat |

SPV: pastikan ada **satu owner** di induk. Anak boleh tetap di group/assignee masing-masing.

---

## 7. Lab tenant demo (Bank Nusantara)

Account **Bank Nusantara**. Jangan pakai *Backup gagal* / *AC ruang server* (itu RCA Internal).

| Peran | Judul | Status | Badge |
| --- | --- | --- | --- |
| Induk | *WAN Bank Nusantara putus* | in progress, critical | **Major** |
| Anak | *ATM cabang Senayan offline* | open, high | **Anak** |
| Anak | *Internet teller cabang Kelapa Gading down* | open, high | **Anak** |
| Anak (request) | *Reset VPN cabang BSD* | open, medium | **Anak** |

Skrip presenter (2 menit):

1. Switcher → **Bank Nusantara** → Incidents → *WAN Bank Nusantara putus*.
2. Badge **Major**. Panel kanan: tiga child. Bukan panel **Related problem**.
3. Buka *ATM cabang Senayan offline* — tautan ke induk.
4. Tunjukkan centang **Selesaikan juga tiket anak** di kartu status induk. **Jangan Save** di demo bersama (seed harus tetap terbuka).

Kalau tiket belum ada: seed `supabase/seed.sql` (blok major incident) atau buat dua INC baru lalu tautkan.

Skrip klik untuk GitHub / presenter: [DEMO-MAJOR-INCIDENT.md](../DEMO-MAJOR-INCIDENT.md).
