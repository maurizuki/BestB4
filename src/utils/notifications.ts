import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Item } from '@/composables/useItems';
import { reminderTime } from '@/utils/expiry';

const REMINDER_BODY = 'Best before today.';

/* Reminders are a convenience on top of the list, and the plugin rejects in the two
   situations we do not control - a browser with no Notification API, and a user who denied
   permission - so a failure is reported but never propagated: it must not bubble into the
   UI and undo the expiration date the user just set. */
const attempt = async (action: () => Promise<unknown>): Promise<void> => {
  try {
    await action();
  } catch (error) {
    console.error('The expiry reminder could not be updated.', error);
  }
};

/* Null whenever there is nothing to schedule: no date set, or a 09:00 already gone by. */
const toNotification = (item: Item): LocalNotificationSchema | null => {
  const at = item.expiresOn === null ? null : reminderTime(item.expiresOn);
  if (at === null) {
    return null;
  }

  /* No allowWhileIdle: a morning reminder tolerates a Doze delay of minutes, and asking for
     exact alarms means Android deletes every scheduled notification if the user later
     revokes that permission. */
  return { id: item.id, title: item.description, body: REMINDER_BODY, schedule: { at } };
};

export const scheduleExpiryNotification = (item: Item): void => {
  const notification = toNotification(item);
  if (notification === null) {
    return;
  }

  void attempt(() => LocalNotifications.schedule({ notifications: [notification] }));
};

export const cancelExpiryNotification = (item: Item): void => {
  void attempt(() => LocalNotifications.cancel({ notifications: [{ id: item.id }] }));
};

/* Pending notifications do not survive everything the list survives: the web implementation
   loses them on every reload, a restored backup arrives with none, and iOS silently drops
   the oldest past 64. The stored list is the source of truth, so it is re-applied at
   startup. Scheduling an id that is already pending replaces it, so this is idempotent. */
export const syncNotifications = (items: readonly Item[]): void => {
  const notifications = items
    .map(toNotification)
    .filter((notification): notification is LocalNotificationSchema => notification !== null);

  /* Returning early also keeps a first run, where nothing is dated yet, from raising the
     permission prompt that schedule() triggers - that prompt belongs to the first bell tap. */
  if (notifications.length === 0) {
    return;
  }

  void attempt(() => LocalNotifications.schedule({ notifications }));
};
