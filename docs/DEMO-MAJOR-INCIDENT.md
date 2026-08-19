# Simulasi demo — Major incident (parent + child)

Skrip klik 2 menit di tenant **NovaCRM Demo**. Bukan RCA. Bukan membuat tiket baru.

**Produksi:** https://novacrm.click  
**Laptop:** http://localhost:3000 setelah `npm run local:setup`  
**Login:** `agent@novacrm.app` / `NovaCRM!2026`  
**Account:** **Bank Nusantara** (bukan Internal, bukan All)

Prosedur lengkap (aturan, taut, resolve massal): [user-guide/major-incident.md](user-guide/major-incident.md).  
Skrip desk penuh: [DEMO-E2E.md](DEMO-E2E.md) langkah 4.3.5.

---

## Data seed

| Peran | Judul | Nomor di novacrm.click | Status |
| --- | --- | --- | --- |
| Induk | *WAN Bank Nusantara putus* | `INC0000018` | in progress, critical → badge **Major** |
| Anak | *ATM cabang Senayan offline* | `INC0000019` | open, high → badge **Anak** |
| Anak | *Internet teller cabang Kelapa Gading down* | `INC0000020` | open, high → badge **Anak** |
| Anak | *Reset VPN cabang BSD* | `RITM0000005` | request, open → badge **Anak** |

Laptop memakai judul yang sama; nomor INC/RITM mengikuti counter lokal.

**Jangan** buka *Backup gagal semalam* atau *AC ruang server panas* — itu **Problem RCA** di account **Internal**.

---

## Klik (presenter)

1. Login `agent@` → sidebar switcher **Bank Nusantara**.
2. **Incidents** → *WAN Bank Nusantara putus* (`INC0000018`).
3. Judul: badge **Major**. Panel kanan **Major incident**: tiga child (bukan panel **Related problem**).
4. Klik *ATM cabang Senayan offline* → badge **Anak**, tautan ke induk.
5. Kembali ke induk. Kartu **Update status**: tunjukkan centang **Selesaikan juga tiket anak**. **Jangan Save** di tenant bersama.

Kalimat penutup: *satu outage, banyak tiket cabang; induk tetap incident, bukan problem.*

---

## Kalau tiket tidak ada

Blok idempotent di [`supabase/seed.sql`](../supabase/seed.sql) (judul *WAN Bank Nusantara putus*). Jangan `supabase db reset` di produksi. Di hosted demo, seed itu sudah diterapkan.

UI panel hanya ada jika image web sudah `git pull` + `up --scale web=1` (Actions SSH sering skip).
