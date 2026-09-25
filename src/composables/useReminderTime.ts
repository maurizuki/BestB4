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

import { readonly, ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { reportError } from '@/utils/toast';

/* Deliberately a leaf: notifications.ts reads the time from here, so this module must not
   depend on anything that imports notifications.ts. */

export const DEFAULT_REMINDER_TIME = '09:00';

/* Preferences namespaces its keys, so this one only has to be unique within the app. */
const STORAGE_KEY = 'reminderTime';

/* Quarter hours only. The picker offers these and validation accepts only these, so a stored
   time can never be one the picker is unable to show. */
export const REMINDER_MINUTES = [0, 15, 30, 45];

/* Two-digit 24-hour HH:mm, the format ion-datetime accepts and emits. */
const TIME_PATTERN = /^([01]\d|2[0-3]):(\d{2})$/;

const reminderTime = ref(DEFAULT_REMINDER_TIME);

export const isReminderTime = (value: unknown): value is string => {
  const match = typeof value === 'string' ? TIME_PATTERN.exec(value) : null;
  return match !== null && REMINDER_MINUTES.includes(Number(match[2]));
};

/* Awaited before the items load, because loading them re-arms the reminders at this time. */
export const loadReminderTime = async (): Promise<void> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    /* Anything unrecognised falls back to the default: a garbled preference is not something
       the user could act on. */
    if (isReminderTime(value)) {
      reminderTime.value = value;
    }
  } catch (error) {
    reportError('Your settings could not be loaded.', error);
  }
};

export function useReminderTime() {
  const setReminderTime = (time: string): void => {
    reminderTime.value = time;
    void Preferences.set({ key: STORAGE_KEY, value: time }).catch((error: unknown) =>
      reportError('Your settings could not be saved.', error)
    );
  };

  return { reminderTime: readonly(reminderTime), setReminderTime };
}
