import { loadLocalEnvFile } from '../lib/config/load-local-env';
import { startNotificationWorker } from '../lib/queue/notification.worker';
import { startWorkflowWorker } from '../lib/queue/workflow.worker';

loadLocalEnvFile();

const notificationWorker = startNotificationWorker();
const workflowWorker = startWorkflowWorker();

console.info('NovaCRM workers listening on novacrm-notifications + novacrm-workflows');

async function shutdown() {
  await Promise.all([notificationWorker.close(), workflowWorker.close()]);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
