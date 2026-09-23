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
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  type RadioGroupCustomEvent
} from '@ionic/vue';
import { type Theme, useTheme } from '@/composables/useTheme';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const { theme, setTheme } = useTheme();

/* No Save step: a choice is applied the moment it is made. */
const onThemeChange = (event: RadioGroupCustomEvent<Theme>) => setTheme(event.detail.value);
</script>
