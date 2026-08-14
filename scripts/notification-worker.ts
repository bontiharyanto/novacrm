import { loadLocalEnvFile } from '../lib/config/load-local-env';
import { startNotificationWorker } from '../lib/queue/notification.worker';
import { startWorkflowWorker } from '../lib/queue/workflow.worker';
import { startWfmWorker } from '../lib/queue/wfm.worker';

loadLocalEnvFile();

const notificationWorker = startNotificationWorker();
const workflowWorker = startWorkflowWorker();
const wfmWorker = startWfmWorker();

console.info('NovaCRM workers listening on novacrm-notifications + novacrm-workflows + novacrm-wfm');

async function shutdown() {
  await Promise.all([notificationWorker.close(), workflowWorker.close(), wfmWorker.close()]);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
