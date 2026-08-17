# Workers (BullMQ)

**Audience:** engineer / sysadmin  
**Related:** [Ops console](OPS.md) · [Local laptop](LOCAL.md) · [Production deploy](DEPLOYMENT.md)

Web replica menangani HTTP. **Worker** menarik job dari Redis. Jangan samakan jumlahnya.

## Yang sudah jalan (default)

Satu proses `npm run worker` membuka **empat** antrian:

| Queue | Concurrency per proses | Isi job |
| --- | --- | --- |
| `novacrm-notifications` | 5 | WhatsApp, Telegram, email |
| `novacrm-workflows` | 3 | Flow Designer (assign, status, notifikasi) |
| `novacrm-wfm` | 4 | Dispatch roster / on-call |
| `novacrm-csat` | 1 | Auto 5/5 after 7 working days without CSAT |

**1 container ≈ 13 job paralel.** Laptop dan VPS awal: **1 worker**. Produksi yang harus tetap hidup saat deploy: **2**. Jarang perlu lebih dari 3.

Cek jumlah worker di Ops: [http://127.0.0.1:3100](http://127.0.0.1:3100) — kolom workers per queue. Satu proses = 1 worker per queue (bukan 12).

---

## Kapan menambah container

Tambah replica worker jika:

- Waiting di Ops tetap > 0 selama beberapa menit setelah burst tiket
- Anda butuh HA (satu container mati, yang lain tetap tarik job)
- Deploy rolling: worker lama berhenti, yang baru belum siap

Naikkan **concurrency dulu** jika hanya satu queue yang menumpuk (edit file di bawah). Naikkan **jumlah container** jika butuh HA atau ketiga queue sibuk.

| File | Queue | Default |
| --- | --- | --- |
| `lib/queue/notification.worker.ts` | notifications | `concurrency: 5` |
| `lib/queue/workflow.worker.ts` | workflows | `concurrency: 3` |
| `lib/queue/wfm.worker.ts` | wfm | `concurrency: 4` |
| `lib/queue/csat.worker.ts` | csat | `concurrency: 1` |

Workflow menulis tiket — jangan naikkan concurrency terlalu tinggi (race). Notifikasi ke Fonnte/Resend mudah kena rate limit jika `container × concurrency` besar.

---

## Laptop — hot reload (`:3000`)

`npm run local:dev` sudah menjalankan **satu** `npm run worker`.

Proses kedua (terminal baru, `.env.local` sudah ada):

```bash
cd novacrm
npm run worker
```

Ops harus menunjukkan **2** workers per queue. Ctrl+C di terminal itu menghentikan proses tambahan saja. Ctrl+C di `local:dev` menghentikan worker yang di-spawn skrip.

Jangan menjalankan lebih dari 2 di laptop — Redis lokal dan API lab tidak butuh itu.

---

## Laptop — Docker (`:3001`)

Stack: `docker-compose.local.yml`, service `worker`. Default 1 replica.

Naikkan ke 2 (image sudah di-build oleh `npm run local:deploy`):

```bash
cd novacrm
docker compose -f docker-compose.local.yml --env-file .env.local up -d --scale worker=2 --no-recreate
docker compose -f docker-compose.local.yml ps worker
```

Kembali ke 1:

```bash
docker compose -f docker-compose.local.yml --env-file .env.local up -d --scale worker=1 --no-recreate
```

`npm run local:deploy` (tanpa `--scale`) mengembalikan worker ke **1**. Setelah rebuild, ulangi perintah `--scale worker=2` jika masih diperlukan.

---

## Produksi (VPS)

Compose: `docker-compose.prod.yml`, service `worker`. CI dan bootstrap memakai `--scale web=3` dan **tidak** men-scale worker (tetap 1).

### Sekali jalan (langsung di VPS)

```bash
cd /opt/novacrm
docker compose -f docker-compose.prod.yml up -d --scale web=3 --scale worker=2
docker compose -f docker-compose.prod.yml ps worker
```

Harus kelihatan `worker-1` dan `worker-2`. Keduanya `command: npm run worker`, Redis yang sama.

Turunkan:

```bash
docker compose -f docker-compose.prod.yml up -d --scale web=3 --scale worker=1
```

**Penting:** push berikutnya ke `main` menjalankan deploy CI dengan `--scale web=3` saja. Compose men-reset worker ke 1 kecuali Anda mengubah skrip di bawah.

### Agar 2 worker bertahan setelah deploy GitHub

Edit ketiga tempat ini (nilai yang sama):

1. `.github/workflows/deploy.yml` — baris `docker compose ... up -d`:

```bash
docker compose -f docker-compose.prod.yml up -d --remove-orphans --scale web=3 --scale worker=2
```

2. `scripts/bootstrap-vps.sh` — perintah `up` yang sama.

3. Contoh di [DEPLOYMENT.md](DEPLOYMENT.md) / [SERVER.md](SERVER.md) supaya runbook tidak menimpa replica.

Commit dan push. Deploy berikutnya menjaga 2 worker.

Jangan set `deploy.replicas` di Compose file: tanpa Swarm, `docker compose up` mengabaikannya. Pakai `--scale`.

---

## Verifikasi

1. Ops → ketiga queue, **workers** = jumlah container (2 container → 2 per queue).
2. `GET /api/health` — Redis `up`.
3. Buat tiket uji → status change harus tetap mengirim notifikasi.
4. Failed jobs: **Retry** di Ops, bukan menambah worker.

```bash
# laptop Docker
docker compose -f docker-compose.local.yml logs -f worker --tail=50

# VPS
docker compose -f docker-compose.prod.yml logs -f worker --tail=50
```

Log sehat: `[notification-worker] job … sent` / `[workflow-worker] job … ran`.

---

## Yang tidak dilakukan

- Jangan scale `web` untuk mempercepat antrian. Web tidak memproses BullMQ.
- Jangan satu worker per queue terpisah kecuali Anda memecah `scripts/notification-worker.ts`.
- Jangan samakan jumlah worker dengan jumlah agent.
- Jangan expose Redis ke internet hanya untuk menambah worker di mesin lain. Replica worker harus di jaringan Compose yang sama (`REDIS_URL: redis://redis:6379`).
