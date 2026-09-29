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
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button @click="emit('close')">Close</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding ion-text-center">
    <h1>BestB4</h1>
    <p v-if="version" class="version">Version {{ version }}</p>
    <p>© 2026+ Maurizio Basaglia</p>
    <p>
      <a :href="LICENSE_URL" target="_blank" rel="noopener noreferrer">
        GNU General Public License v3.0
      </a>
    </p>
    <ion-button href="https://github.com/maurizuki/BestB4/issues" target="_blank" rel="noopener noreferrer">Support and feedback</ion-button>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonToolbar } from '@ionic/vue';
import { App } from '@capacitor/app';
import { onMounted, ref } from 'vue';

const LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';

const emit = defineEmits<{ close: [] }>();

const version = ref<string>();

/* The Android versionName. The web build has no such thing (getInfo rejects there), so the
   version line is left out rather than showing a made-up one. */
onMounted(async () => {
  try {
    version.value = (await App.getInfo()).version;
  } catch {
    version.value = undefined;
  }
});
</script>
