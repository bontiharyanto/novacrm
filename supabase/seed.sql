-- NovaCRM seed data
-- 1 tenant, 3 users, 10 tickets, 3 notification channels

insert into public.notification_channels (id, tenant_id, type, config, is_active, created_by)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'whatsapp', '{"apiKey":"demo-whatsapp-key","target":"6281234567890"}', true, null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'telegram', '{"botToken":"demo-telegram-token","chatId":"-1001234567890"}', true, null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'email', '{"apiKey":"demo-resend-key","from":"NovaCRM <no-reply@novacrm.app>"}', true, null)
on conflict do nothing;

insert into public.tickets (
  id, tenant_id, title, description, status, priority, assignee_id, requester_id, category, due_date, created_by
)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Laptop tidak bisa boot', 'Laptop user mengalami blue screen saat mulai. Mohon cek segera.', 'open', 'high', null, null, 'hardware', now() + interval '1 day', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'VPN tidak terhubung', 'Karyawan gagal menyambung ke VPN dari rumah.', 'in_progress', 'critical', null, null, 'network', now() + interval '12 hours', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Printer offline', 'Printer di ruang marketing tidak bisa digunakan.', 'waiting', 'medium', null, null, 'printer', now() + interval '2 days', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Email tertunda', 'Inbox beberapa user tertahan di server relay.', 'open', 'high', null, null, 'email', now() + interval '8 hours', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Monitor bergaris', 'Monitor di workstation QA terdapat garis vertikal.', 'resolved', 'low', null, null, 'hardware', now() - interval '1 day', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Aplikasi CRM lag', 'Aplikasi CRM terasa lambat saat jam kerja.', 'in_progress', 'high', null, null, 'application', now() + interval '1 day', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Password tidak bisa reset', 'Karyawan tidak menerima email reset password.', 'waiting', 'medium', null, null, 'identity', now() + interval '3 days', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Server database warning', 'CPU server DB melebihi threshold pada jam 13.00.', 'open', 'critical', null, null, 'infrastructure', now() + interval '6 hours', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'User baru butuh akun', 'User baru dari departemen sales memerlukan akses Gmail dan Slack.', 'closed', 'low', null, null, 'access', now() - interval '3 days', null),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Scanner gagal membaca barcode', 'Scanner di gudang tidak bisa membaca label baru.', 'open', 'medium', null, null, 'scanner', now() + interval '2 days', null);

insert into public.notification_logs (tenant_id, channel, recipient, subject, body, status, ticket_id)
values
  ('11111111-1111-1111-1111-111111111111', 'whatsapp', '6281234567890', 'Ticket baru dibuat', 'Halo, tiket baru telah dibuat.', 'sent', null),
  ('11111111-1111-1111-1111-111111111111', 'telegram', '-1001234567890', 'Update status', 'Ada update status tiket baru.', 'sent', null),
  ('11111111-1111-1111-1111-111111111111', 'email', 'customer@example.com', 'Ticket #123 dibuat', 'Ticket Anda telah dibuat.', 'sent', null);
