# Panduan Service Catalog & Record Producer

**Audience:** supervisor / admin yang merancang katalog, agent yang membuat tiket dari item, customer di portal  
**Companion:** [Participant manual](participant-manual.md) §8, [Trainer guide](trainer-guide.md)  
**UI:** default chrome **ID** (Published / Draf, record producer, prioritas). Ganti `EN | ID` di top bar kapan saja.

Dokumen ini menjelaskan **seluruh alur katalog**: kapan memakai item, arti setiap field, cara menambah item baru (contoh **Install Antivirus**), dan cara mengujinya dari desk serta portal.

---

## 1. Apa itu catalog item

Catalog item (record producer) adalah **template intake**. Saat dipilih, sistem:

1. Membuat tiket dengan **jenis** yang sudah ditetapkan (`Creates`: Request / Incident / Change / Problem).
2. Mengisi **prioritas default** dari item.
3. Menampilkan **pertanyaan** (item variables + variable set) kepada pemohon.
4. Menyalin **fulfillment notes** ke deskripsi tiket sebagai instruksi tim pelaksana.
5. Menyimpan jawaban di **Catalog answers** pada tiket.

Bukan daftar aplikasi. Bukan CMDB. Bukan workflow. Item hanya merapikan *cara tiket masuk*.

| Siapa | Yang mereka lakukan |
| --- | --- |
| Supervisor / admin | Rancang item di `/catalog` |
| Agent / SPV | Pilih item saat **Tiket baru** (Request, Incident opsional, Change standard) |
| Customer | Isi item di **Portal → Catalog** |

---

## 2. Pilih proses dulu, baru buat item

Field **Creates** menentukan antrian tiket. Jangan campur proses.

| Creates | Prefix | Pakai jika | Combo di Tiket baru | Contoh item |
| --- | --- | --- | --- | --- |
| **Request** | RITM | User minta sesuatu yang sudah disetujui sebagai layanan | Ya — opsional; boleh ad-hoc tanpa item | Install Software, VPN, laptop |
| **Incident** | INC | Layanan terganggu / tidak direncanakan | Ya — hanya jika ada item published bertipe Incident | Report a service outage |
| **Change** | CHG | Ubah infrastruktur secara terkendali | **Hanya** jika Change type = **Standard**; template wajib | Restart service, firewall allow, renew TLS |
| **Problem** | PRB | Cari akar penyebab beberapa incident | **Tidak** — Problem butuh related incident + workaround, bukan form katalog | — |

**Aturan praktis**

- Pasang aplikasi, akses, hardware baru → **Request**.
- Email / VPN / ERP down → **Incident** (boleh template, jangan dipaksa).
- Restart service, rule firewall yang sudah di-approve, ganti sertifikat → **Change** + kategori Standard change.
- Normal / Emergency change → **jangan** pakai catalog; isi rencana implementasi, backout, dan CAB.
- Problem → **jangan** buat catalog item.

---

## 3. Objek katalog

```
Category          pengelompokan di combo / kartu (Software, Hardware, Access, …)
    └── Item      record producer (Install Software, Install Antivirus, …)
            ├── Item variables     pertanyaan khusus item ini
            └── Variable set       paket field bersama (opsional)
```

| Objek | URL | Isi |
| --- | --- | --- |
| Daftar item + set | `/catalog` | Kartu item, tombol **New**, **New variable set** |
| Editor item | `/catalog/new` atau `/catalog/{id}` | Form di tengah + sidebar Record producer |
| Editor variable set | `/catalog/sets/new` atau `/catalog/sets/{id}` | Field yang dipakai ulang banyak item |
| Portal browse | `/portal/catalog` | Kartu item published (customer) |
| Portal isi item | `/portal/catalog/{id}` | Record producer |

Hanya item **Published** (`is_active`) yang muncul di combo desk dan portal.

---

## 4. Arti setiap field di editor

Buka **Katalog → New**. Layout: judul + status di header, pertanyaan di kiri, pengaturan tiket di kanan.

### 4.1 Header

| Field | Artinya | Contoh Antivirus |
| --- | --- | --- |
| **Item name** (judul besar) | Nama yang tampil di combo dan kartu | `Install Antivirus` |
| **Published / Draft** | Published = bisa dipilih. Draft = tersimpan, tersembunyi | Published setelah uji |
| **Save item** | Tulis ke database. Item baru mendapat URL `/catalog/{id}` | — |

Nama wajib. Tanpa nama, **Save item** nonaktif.

### 4.2 Kolom kiri — apa yang dilihat pemohon dan fulfiller

| Field | Artinya | Siapa yang membacanya | Contoh Antivirus |
| --- | --- | --- | --- |
| **Short description** | Satu kalimat di combo / kartu. Bukan judul tiket. Maks. 240 karakter | Pemohon | `Pasang antivirus korporat ke perangkat user` |
| **Fulfillment notes** | Langkah kerja tim. Disalin ke deskripsi tiket. Maks. 4000 karakter | Agent / L2 | Lihat §6 |
| **Item variables** | Pertanyaan form. Label = UI, Key = nama teknis | Pemohon mengisi | `device_name`, `os`, `reason` |

**Short description** untuk *menemukan* item. **Fulfillment notes** untuk *mengerjakan* tiket. Jangan menukar keduanya.

### 4.3 Sidebar — Record producer

| Field | Artinya | Isi yang benar |
| --- | --- | --- |
| **Creates** | Jenis tiket yang dibuat | Request untuk software/antivirus. Change hanya untuk standard change |
| **Priority** | Prioritas default tiket (bisa diubah agent saat create) | Antivirus: **Medium**. Install software biasa: Low |
| **Icon** | Ikon kartu | Software, Hardware, Access, Network, Incident, Request |
| **Category** | Filter / kelompok | Software, atau buat **Security** lalu **Add** |
| **Variable set** | Paket field bersama, digabung ke pertanyaan item | `Requester details` (Location, Cost center) |

**New category** di bawah dropdown: ketik nama → **Add**. Kategori langsung terpilih.

**New variable set** membuka `/catalog/sets/new`. Setelah set tersimpan, kembali ke item dan pilih dari dropdown.

---

## 5. Item variables

Klik **Add variable**. Setiap baris = satu pertanyaan.

| Field | Aturan |
| --- | --- |
| **Label** | Teks yang dilihat user. Bahasa manusia. Maks. 120 karakter |
| **Key** | Identitas teknis. Huruf kecil, underscore, tanpa spasi (spasi otomatis jadi `_`). Unik per item. Maks. 80 karakter |
| **Type** | `text` · `textarea` · `select` · `checkbox` |
| **Required** | Jika dicentang, submit ditolak sampai terisi |
| **Options** | Hanya untuk `select`. Pisah koma: `Windows 11, Windows 10, macOS` |

| Type | Kapan dipakai |
| --- | --- |
| **text** | Satu baris: hostname, email, nama aplikasi |
| **textarea** | Alasan, dampak, justifikasi |
| **select** | Pilihan terbatas yang sudah Anda tentukan |
| **checkbox** | Konfirmasi ya/tidak: identitas terverifikasi, user sudah logout |

Variable set menempel **di depan / digabung** dengan item variables. Key di set dan di item jangan bentrok (`location` di set + `location` di item = tabrakan).

---

## 6. Contoh lengkap — Install Antivirus

Ini contoh kerja yang sama polanya dengan item seed **Install software**.

### 6.1 Buka form

1. Login `admin@novacrm.app` atau `spv@novacrm.app`.
2. Sidebar → **Catalog** → **New**.
3. Ketik judul: `Install Antivirus`.
4. Pastikan tombol status **Published** (bukan Draft) sebelum uji di combo.

### 6.2 Isi kolom kiri

**Short description**

```
Pasang antivirus korporat ke perangkat user
```

**Fulfillment notes**

```
1. Cek perangkat ada di CMDB / ITAM dan milik akun customer yang sama.
2. Pastikan lisensi antivirus masih tersedia.
3. Push paket lewat SCCM / Intune ke hostname yang diminta.
4. Minta user reboot, verifikasi agent online di console.
5. Tutup tiket setelah status protected.
```

### 6.3 Item variables

| Label | Key | Type | Required | Options |
| --- | --- | --- | --- | --- |
| Nama perangkat / hostname | `device_name` | text | ya | — |
| Sistem operasi | `os` | select | ya | `Windows 11, Windows 10, macOS` |
| Alasan | `reason` | textarea | ya | — |
| User sudah logout | `user_notified` | checkbox | tidak | — |

### 6.4 Sidebar

| Field | Nilai |
| --- | --- |
| Creates | **Request** |
| Priority | **Medium** |
| Icon | **Software** |
| Category | **Software** — atau ketik `Security` lalu **Add** |
| Variable set | **Requester details** |

**Requester details** (seed) menambah Location (wajib, select: Jakarta HQ / DC-1 / Remote) dan Cost center (opsional). Tidak perlu diketik ulang di item.

### 6.5 Simpan dan uji

1. **Save item**.
2. Sidebar → **Permintaan** → **Tiket baru** (atau `/tickets/new?type=request`).
3. Pilih akun customer (mis. Bank Nusantara).
4. Combo **Item katalog** → **Install Antivirus**.
5. Field Device / OS / Alasan + Location harus muncul.
6. Isi, submit.
7. Tiket RITM terbuat. Jawaban ada di detail tiket (Catalog answers). Fulfillment notes ada di deskripsi.

Uji portal: login `customer@novacrm.app` → **Catalog** → kartu **Install Antivirus** → submit. Agent melihat tiket yang sama di **Requests**.

---

## 7. Bedanya dengan item yang sudah ada

| Item (seed) | Creates | Inti pertanyaan | Fulfillment |
| --- | --- | --- | --- |
| **Install software** | Request · Low | Aplikasi + alasan | Cek lisensi, package, assign |
| **Install Antivirus** (contoh baru) | Request · Medium | Hostname + OS + alasan | Push agent keamanan, verifikasi console |
| **Request a laptop** | Request · Medium | Model + justifikasi | Ambil stok ITAM |
| **VPN access** | Request · Medium | Durasi + email manager | Identity enable VPN |
| **Password reset** | Request · High | Akun + checkbox verifikasi | Reset directory |
| **Report a service outage** | Incident · High | Service + siapa terdampak | Service desk INC |
| **Restart application service** | Change · Low | CI + window | Standard change, tanpa CAB |
| **Add pre-approved firewall allow rule** | Change · Medium | Source / dest / port | Standard change |
| **Renew TLS certificate** | Change · Medium | Hostname + expiry | Standard change |

Install Software vs Install Antivirus: sama-sama Request. Antivirus butuh **target perangkat** dan prioritas lebih tinggi karena keamanan.

---

## 8. Cara item dipakai di desk

Form **Tiket baru** (`/tickets/new`) memuat catalog sesuai jenis proses.

| Jenis tiket | Combo katalog | Wajib? |
| --- | --- | --- |
| Request | Semua item Request yang Published | Tidak. Boleh **Ad-hoc request — no catalog item** |
| Incident | Hanya jika ada item Incident published | Tidak |
| Change + type **Standard** | Item Change published (kategori Standard change) | **Ya** — tanpa template, submit ditolak |
| Change + Normal / Emergency | Tidak tampil | Rencana implementasi + backout + CAB |
| Problem | Tidak tampil | Related incident / workaround, bukan katalog |

Memilih item biasanya mengisi judul, prioritas, dan (untuk standard change) rencana implementasi dari fulfillment notes.

Jawaban variabel wajib dicek sebelum submit. Field kosong yang **Required** menampilkan error, tiket tidak dibuat.

---

## 9. Variable set

Pakai set jika **lebih dari satu item** butuh field yang sama.

Seed: **Requester details**

| Label | Key | Type | Required |
| --- | --- | --- | --- |
| Location | `location` | select | ya — Jakarta HQ, DC-1, Remote |
| Cost center | `cost_center` | text | tidak |

Membuat set baru:

1. `/catalog` → **New variable set** (atau `/catalog/sets/new`).
2. Nama, deskripsi, variabel — aturan Key/Type sama dengan item.
3. Save. Buka item → pilih set di sidebar.

Jangan taruh pertanyaan yang hanya relevan satu item ke dalam set. Hostname antivirus tetap di item variables.

---

## 10. Published, Draft, dan hak akses

| Status | Efek |
| --- | --- |
| **Published** | Muncul di combo desk dan portal |
| **Draft** | Tersimpan, tidak bisa dipilih pemohon |

Yang merancang katalog: **supervisor**, **manager**, **admin** (tulis). Agent bisa melihat item published saat create tiket. Customer hanya melihat item published di portal.

Setiap item terikat `tenant_id`. Data demo hanya untuk tenant lab.

---

## 11. Checklist sebelum Publish

- [ ] **Creates** sesuai proses (Request ≠ Change).
- [ ] Short description satu kalimat, tanpa langkah teknis.
- [ ] Fulfillment notes bernomor, bisa dikerjakan L1/L2 tanpa menebak.
- [ ] Setiap Key unik, snake_case, tidak bentrok dengan variable set.
- [ ] Select punya options yang lengkap (jangan biarkan kosong).
- [ ] Required hanya untuk data yang benar-benar menahan fulfillment.
- [ ] Uji dari **Tiket baru** (akun customer terpilih) dan dari **Portal**.
- [ ] Jawaban tampil di detail tiket; jenis tiket masuk antrian yang benar (Requests / Incidents / Changes).

---

## 12. Kesalahan yang sering terjadi

| Salah | Akibat | Perbaikan |
| --- | --- | --- |
| Install Antivirus di-set **Creates = Change** | Masuk antrian CHG / CAB | Creates = **Request** |
| Standard change tanpa item | Submit ditolak | Buat item Change + pilih Change type Standard |
| Key `Device Name` (ada spasi) | Tidak konsisten di answers | `device_name` |
| Fulfillment notes di Short description | Combo jadi panjang, fulfiller tidak dapat langkah | Pindahkan ke Fulfillment notes |
| Semua field Required | User batal submit | Wajibkan hanya yang menahan pekerjaan |
| Item Draft lalu heran tidak muncul di combo | Combo hanya Published | Toggle **Published**, Save |
| Problem dijadikan catalog | Form tidak relevan | Jangan buat item Problem |

---

## 13. Inbound WhatsApp / Telegram / email

Pesan masuk (bukan alert) dicocokkan ke item **Published** bertipe Request atau Incident. Change dan Problem tidak di-auto-match.

Contoh: `butuh VPN 90 hari, manager ana@bank.co.id` → tiket **VPN access** (`RITM`), `duration` = 90 days, `manager` terisi. Balasan: `Ticket RITM… telah dibuat (VPN access)`. Field wajib yang kosong disebut di balasan (`Lengkapi: Manager email`).

Pencocokan memakai nama/slug/kata kunci (VPN, install, password, outage). Jika AI tenant aktif, jawaban variabel bisa dilengkapi dari teks. Alert monitoring tetap incident biasa — tidak memakai katalog.

Agent melihat item + **Catalog answers** di detail tiket, sama seperti submit dari desk/portal.

---

## 14. Item seed (lab)

Tenant demo sudah berisi item di atas (§7). Untuk latihan kelas, **salin pola Install software** — jangan menimpa item seed kecuali tenant terisolasi.

Login uji:

| Role | Email | Password | Tempat uji |
| --- | --- | --- | --- |
| Admin / SPV | `admin@novacrm.app` | `NovaCRM!2026` | `/catalog` + `/tickets/new?type=request` |
| Agent | `agent@novacrm.app` | `NovaCRM!2026` | Tiket baru → pilih item |
| Customer | `customer@novacrm.app` | `NovaCRM!2026` | `/portal/catalog` |

Password lab hanya untuk tenant demo. Jangan dipakai di produksi.

---

## 15. Referensi cepat — Install Antivirus

Salin ke editor jika membuat item sekarang:

```
Name:                 Install Antivirus
Short description:    Pasang antivirus korporat ke perangkat user
Creates:              Request
Priority:             Medium
Icon:                 Software
Category:             Software  (atau Security)
Variable set:         Requester details
Published:            Yes

Variables:
  device_name     text       required    Nama perangkat / hostname
  os              select     required    Windows 11, Windows 10, macOS
  reason          textarea   required    Alasan
  user_notified   checkbox   optional    User sudah logout
```
