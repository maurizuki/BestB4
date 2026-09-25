<!--
  Copyright (C) 2026+ Maurizio Basaglia

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://gnu.org>.
-->

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-list-header>
          <ion-label>Theme</ion-label>
        </ion-list-header>
        <ion-radio-group :value="theme" @ionChange="onThemeChange">
          <ion-item v-for="option in THEME_OPTIONS" :key="option.value">
            <ion-radio :value="option.value">{{ option.label }}</ion-radio>
          </ion-item>
        </ion-radio-group>

        <ion-list-header>
          <ion-label>Reminders</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Time</ion-label>
          <ion-datetime-button slot="end" datetime="reminder-time" />
        </ion-item>
      </ion-list>

      <!-- Kept mounted: the button looks the datetime up by id once, when it loads. -->
      <ion-popover :keep-contents-mounted="true">
        <ion-datetime
          id="reminder-time"
          presentation="time"
          :minute-values="REMINDER_MINUTES"
          :value="reminderTime"
          @ionChange="onTimeChange"
        />
      </ion-popover>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonPopover,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  type DatetimeCustomEvent,
  type RadioGroupCustomEvent
} from '@ionic/vue';
import { useItems } from '@/composables/useItems';
import {
  isReminderTime,
  REMINDER_MINUTES,
  useReminderTime
} from '@/composables/useReminderTime';
import { type Theme, useTheme } from '@/composables/useTheme';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const { theme, setTheme } = useTheme();
const { reminderTime, setReminderTime } = useReminderTime();
const { rescheduleReminders } = useItems();

/* No Save step: a choice is applied the moment it is made. */
const onThemeChange = (event: RadioGroupCustomEvent<Theme>) => setTheme(event.detail.value);

/* Seeded with HH:mm, ion-datetime emits HH:mm; anything else - a clear, or a full ISO string
   should the seed ever be missing - is normalised or ignored rather than stored. */
const onTimeChange = (event: DatetimeCustomEvent) => {
  const value = event.detail.value;
  const time = typeof value === 'string' ? /\d{2}:\d{2}/.exec(value)?.[0] : undefined;
  if (!isReminderTime(time)) {
    return;
  }
  setReminderTime(time);
  /* After the time is set: rescheduling reads it. */
  rescheduleReminders();
};
</script>
