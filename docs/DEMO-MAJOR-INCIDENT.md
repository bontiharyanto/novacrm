# Simulasi demo — Major incident (parent + child)

Skrip klik 2 menit di tenant **NovaCRM Demo**. Bukan RCA. Bukan membuat tiket baru.

**Produksi:** https://novacrm.click  
**Laptop:** http://localhost:3000 setelah `npm run local:setup`  
**Login:** `agent@novacrm.app` / `NovaCRM!2026`  
**Account:** **Bank Nusantara** (bukan Internal, bukan All)

Prosedur lengkap (aturan, taut, resolve massal): [user-guide/major-incident.md](user-guide/major-incident.md).  
CMDB impact + portal banner: [GAMAS-CMDB-IMPACT.md](GAMAS-CMDB-IMPACT.md).  
Skrip desk penuh: [DEMO-E2E.md](DEMO-E2E.md) langkah 4.3.5.

---

## Data seed

| Peran | Judul | Nomor di novacrm.click | Status |
| --- | --- | --- | --- |
| Induk | *WAN Bank Nusantara putus* | `INC0000018` | in progress, critical → badge **Major** |
| Anak | *ATM cabang Senayan offline* | `INC0000019` | open, high → badge **Anak** |
| Anak | *Internet teller cabang Kelapa Gading down* | open, high → badge **Anak** |
| Anak (request) | *Reset VPN cabang BSD* | `RITM0000005` | request, open → badge **Anak** |

Root CI induk (setelah migrate GAMAS): `bank-wan-indosat`.

Portal customer seed: site `Jakarta HQ`, IP `10.20.3.41`.

Laptop memakai judul yang sama; nomor INC/RITM mengikuti counter lokal.

**Jangan** buka *Backup gagal semalam* atau *AC ruang server panas* — itu **Problem RCA** di account **Internal**.

---

## Klik — agent (presenter)

1. Login `agent@` → sidebar switcher **Bank Nusantara**.
2. **Incidents** → *WAN Bank Nusantara putus* (`INC0000018`).
3. Judul: badge **Major**. Panel kanan **Major incident**: tiga child (bukan panel **Related problem**).
4. Sidebar → **Root CI** = `bank-wan-indosat` (jika belum terisi).
5. Klik *ATM cabang Senayan offline* → badge **Anak**, tautan ke induk.
6. Kembali ke induk. Kartu **Update status**: tunjukkan centang **Selesaikan juga tiket anak**. **Jangan Save** di tenant bersama.

Kalimat penutup: *satu outage, banyak tiket cabang; dampak mengikuti graph WAN, bukan tebak manual.*

---

## Klik — portal customer (+1 menit)

1. Logout → `customer@novacrm.app` / `NovaCRM!2026`.
2. **Beranda** → banner *Major incident aktif* (WAN).
3. **Account** → tunjukkan site + IP workstation.
4. **Laporkan insiden** → isi lokasi → banner + centang **Tautkan sebagai child GAMAS** (opsional live submit).

Pakai 2–3 menit ini di demo penjualan: [GTM.md](GTM.md) §6.

---

## Kalau tiket tidak ada

Blok idempotent di [`supabase/seed.sql`](../supabase/seed.sql) (judul *WAN Bank Nusantara putus* + root CI + profile site/IP). Jangan `supabase db reset` di produksi.

Migrasi GAMAS:

```bash
DATABASE_URL='postgresql://...' sh scripts/migrate.sh
```

UI panel hanya ada jika image web sudah `git pull` + `up -d --force-recreate web worker`.
