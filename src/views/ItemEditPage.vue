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
          <ion-button @click="cancel">Cancel</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button :strong="true" :disabled="!canSave" @click="confirm">OK</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item>
          <ion-input
            v-model="description"
            label="Description"
            label-placement="stacked"
            placeholder="What is it?"
            :autofocus="true"
            @keyup.enter="confirm"
          />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="duration"
            type="number"
            inputmode="numeric"
            min="0"
            label="Duration (days)"
            label-placement="stacked"
            placeholder="How long does it last?"
            @keyup.enter="confirm"
          />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonToolbar,
  useIonRouter
} from '@ionic/vue';
import { useRoute } from 'vue-router';
import { useItems } from '@/composables/useItems';

const DEFAULT_DURATION_DAYS = 7;

const route = useRoute();
const ionRouter = useIonRouter();
const { getItem, addItem, updateItem } = useItems();

/* On /item/new there is no :id param, and Number(undefined) is NaN - which no item id can
   equal, so the lookup below correctly finds nothing. */
const itemId = Number(route.params.id);
const isNew = Number.isNaN(itemId);
const existingItem = getItem(itemId);

const description = ref(existingItem?.description ?? '');
const duration = ref(String(existingItem?.durationDays ?? DEFAULT_DURATION_DAYS));

const durationDays = computed(() => Number(duration.value));

const canSave = computed(
  () =>
    description.value.trim().length > 0 &&
    duration.value.trim().length > 0 &&
    Number.isInteger(durationDays.value) &&
    durationDays.value >= 0
);

/* 'back' keeps the transition consistent whether the page was pushed or opened directly. */
const goBack = () => ionRouter.navigate('/home', 'back', 'pop');

const cancel = () => goBack();

const confirm = () => {
  if (!canSave.value) {
    return;
  }

  if (isNew) {
    addItem(description.value, durationDays.value);
  } else {
    updateItem(itemId, description.value, durationDays.value);
  }

  goBack();
};
</script>
