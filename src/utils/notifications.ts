/*
 * Copyright (C) 2026+ Maurizio Basaglia
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://gnu.org>.
 */

import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Item } from '@/composables/useItems';
import { useReminderTime } from '@/composables/useReminderTime';
import { addDays, reminderMoment } from '@/utils/expiry';
import { reportError } from '@/utils/toast';

const { reminderTime } = useReminderTime();

const DAY_BEFORE_BODY = 'Best before tomorrow.';

const EXPIRY_DAY_BODY = 'Best before today.';

/* The expiration-day reminder keeps the item id, so reminders pending from before the day-before
   one existed stay valid. The offset keeps both ids distinct and within Android's 32-bit int. */
const DAY_BEFORE_ID_OFFSET = 1_000_000_000;

const dayBeforeId = (item: Item): number => item.id + DAY_BEFORE_ID_OFFSET;

const reminderIds = (item: Item): number[] => [item.id, dayBeforeId(item)];

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

/* Null once the reminder time on that day has gone by. The time is read on every call, so a
   change applies to the next one. */
const toNotification = (
  id: number,
  item: Item,
  isoDate: string,
  body: string
): LocalNotificationSchema | null => {
  const at = reminderMoment(isoDate, reminderTime.value);
  if (at === null) {
    return null;
  }

  /* Not exact: a morning reminder tolerates a Doze delay of minutes, while an exact alarm can
     send the user to Android's "Alarms & reminders" settings, and revoking that permission
     deletes every scheduled notification. */
  return {
    id,
    title: item.description,
    body,
    schedule: { at },
    isExactNotification: false
  };
};

const isNotification = (
  notification: LocalNotificationSchema | null
): notification is LocalNotificationSchema => notification !== null;

/* The reminders of an item still ahead, the day before first. Empty when no date is set. */
const toNotifications = (item: Item): LocalNotificationSchema[] => {
  if (item.expiresOn === null) {
    return [];
  }

  return [
    toNotification(dayBeforeId(item), item, addDays(item.expiresOn, -1), DAY_BEFORE_BODY),
    toNotification(item.id, item, item.expiresOn, EXPIRY_DAY_BODY)
  ].filter(isNotification);
};

export const scheduleExpiryNotification = (item: Item): void => {
  const notifications = toNotifications(item);
  if (notifications.length === 0) {
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
    await LocalNotifications.schedule({ notifications });
  });
};

export const cancelExpiryNotification = (item: Item): void => {
  void attempt(() =>
    LocalNotifications.cancel({ notifications: reminderIds(item).map((id) => ({ id })) })
  );
};

/* Pending notifications do not survive everything the list survives: the web implementation
   loses them on every reload, a restored backup arrives with none, and iOS silently drops the
   oldest past 64. The stored list is the source of truth, so it is re-applied at startup.
   Scheduling an id that is already pending replaces it, so this is idempotent. */
export const syncNotifications = (items: readonly Item[]): void => {
  const notifications = items.flatMap(toNotifications);

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

    const due = dated.flatMap(toNotifications);
    const dueIds = new Set(due.map(({ id }) => id));
    const stale = dated.flatMap(reminderIds).filter((id) => !dueIds.has(id));
    if (stale.length > 0) {
      await LocalNotifications.cancel({ notifications: stale.map((id) => ({ id })) });
    }
    if (due.length > 0) {
      await LocalNotifications.schedule({ notifications: due });
    }
  });
};
