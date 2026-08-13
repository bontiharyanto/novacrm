import { startNotificationWorker } from '../lib/queue/notification.worker';

const worker = startNotificationWorker();

console.info('NovaCRM notification worker listening on queue novacrm-notifications');

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
