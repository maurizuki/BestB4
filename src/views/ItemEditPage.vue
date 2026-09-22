<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="cancel">Cancel</ion-button>
        </ion-buttons>
        <ion-title>{{ isNew ? 'New' : 'Edit' }}</ion-title>
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
            placeholder="0"
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
  IonTitle,
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
