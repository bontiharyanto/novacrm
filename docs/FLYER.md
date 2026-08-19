# Flyer publik — `www.novacrm.click`

Landing penjualan (GTM). **Bukan** desk. Desk tetap https://novacrm.click.

Template: editorial gelap ala Linear / Vercel (zinc-950, satu aksen biru, Inter + JetBrains Mono). Bukan ThemeForest / Bootstrap. Tidak memuat password lab, harga angka, atau klaim HA.

Isi selaras [GTM.md](GTM.md). CTA: `mailto:support@novacrm.app`.

---

## URL

| Host | Isi |
| --- | --- |
| https://www.novacrm.click | Flyer ini (nginx statis) |
| https://novacrm.click | Aplikasi (login, tiket) |
| http://localhost:3080 | Pratinjau laptop |

---

## Laptop

```bash
docker compose up -d flyer
```

Buka http://localhost:3080

---

## Produksi

1. DNS **A** `www` → `43.133.133.151` (sama seperti `@`).
2. Di VPS `.env.production` tambah:

```
FLYER_HOST=www.novacrm.click
```

3. `git pull` + compose `up -d --scale web=1` (service `flyer` bind-mount `./flyer/public` — **tidak** perlu rebuild image web).

Sertifikat Let's Encrypt terbit setelah DNS `www` sudah resolve. Kalau masih `TRAEFIK DEFAULT CERT`, tunggu propagasi atau cek `docker compose logs traefik`.

Jangan unggah flyer ke apex `novacrm.click` — itu login klien.
