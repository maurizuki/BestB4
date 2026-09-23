import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Item } from '@/composables/useItems';
import { useReminderTime } from '@/composables/useReminderTime';
import { reminderMoment } from '@/utils/expiry';
import { reportError } from '@/utils/toast';

const { reminderTime } = useReminderTime();

const REMINDER_BODY = 'Best before today.';

const NOT_ALLOWED = 'Notifications are not allowed, so no reminder will be shown.';

/* The plugin rejects when the browser has no Notification API, or on Android when
   notifications are disabled. A denied permission elsewhere does not reject - that is
   checked separately. Either way the failure is reported but never propagated: it must not
   bubble into the UI and undo the expiration date the user just set. */
const attempt = async (action: () => Promise<unknown>): Promise<void> => {
  try {
    await action();
  } catch (error) {
    reportError('The reminder could not be updated.', error);
  }
};

/* Null whenever there is nothing to schedule: no date set, or the reminder time on that day
   already gone by. The time is read on every call, so a change applies to the next one. */
const toNotification = (item: Item): LocalNotificationSchema | null => {
  const at = item.expiresOn === null ? null : reminderMoment(item.expiresOn, reminderTime.value);
  if (at === null) {
    return null;
  }

  /* Not exact: a morning reminder tolerates a Doze delay of minutes, while an exact alarm can
     send the user to Android's "Alarms & reminders" settings, and revoking that permission
     deletes every scheduled notification. */
  return {
    id: item.id,
    title: item.description,
    body: REMINDER_BODY,
    schedule: { at },
    isExactNotification: false
  };
};

const isNotification = (
  notification: LocalNotificationSchema | null
): notification is LocalNotificationSchema => notification !== null;

export const scheduleExpiryNotification = (item: Item): void => {
  const notification = toNotification(item);
  if (notification === null) {
    return;
  }

  void attempt(async () => {
    /* Asked here rather than left to schedule(): only native schedule() prompts, and iOS and
       web accept a schedule() under a denied permission without complaint. */
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') {
      reportError(NOT_ALLOWED);
      return;
    }
    await LocalNotifications.schedule({ notifications: [notification] });
  });
};

export const cancelExpiryNotification = (item: Item): void => {
  void attempt(() => LocalNotifications.cancel({ notifications: [{ id: item.id }] }));
};

/* Pending notifications do not survive everything the list survives: the web implementation
   loses them on every reload, a restored backup arrives with none, and iOS silently drops the
   oldest past 64. The stored list is the source of truth, so it is re-applied at startup.
   Scheduling an id that is already pending replaces it, so this is idempotent. */
export const syncNotifications = (items: readonly Item[]): void => {
  const notifications = items.map(toNotification).filter(isNotification);

  if (notifications.length === 0) {
    return;
  }

  void attempt(async () => {
    /* Only checked, never asked: a launch is not a user action that justifies a prompt, and
       a toast on every launch would be noise. */
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      return;
    }
    await LocalNotifications.schedule({ notifications });
  });
};

/* After a reminder time change, every dated item either moves to the new time or, if that
   moment has already passed today, loses its now-stale reminder. Only checked, never asked:
   changing the time is not a request for reminders, and moving the wheel should not nag. */
export const rescheduleReminders = (items: readonly Item[]): void => {
  const dated = items.filter((item) => item.expiresOn !== null);
  if (dated.length === 0) {
    return;
  }

  void attempt(async () => {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      return;
    }

    const due = dated.map(toNotification).filter(isNotification);
    const stale = dated.filter((item) => toNotification(item) === null);
    if (stale.length > 0) {
      await LocalNotifications.cancel({ notifications: stale.map(({ id }) => ({ id })) });
    }
    if (due.length > 0) {
      await LocalNotifications.schedule({ notifications: due });
    }
  });
};
