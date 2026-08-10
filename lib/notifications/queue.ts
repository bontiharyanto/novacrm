import type { NotificationJobPayload } from '../queue/notification.worker';

export const notificationQueue = {
  add: async (name: string, payload: NotificationJobPayload) => ({
    id: `${name}-${Date.now()}`,
    name,
    payload,
    ok: true,
  }),
};

export async function enqueueNotification(payload: NotificationJobPayload) {
  return notificationQueue.add('notification', payload);
}
