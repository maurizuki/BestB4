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
        <ion-title>BestB4</ion-title>
        <ion-buttons slot="end">
          <ion-button id="home-menu" aria-label="Menu">
            <ion-icon slot="icon-only" :icon="ellipsisVertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-popover trigger="home-menu" :dismiss-on-select="true">
      <ion-content>
        <ion-list lines="none">
          <ion-item button :detail="false" @click="openSettings">
            <ion-icon slot="start" :icon="settings" />
            <ion-label>Settings</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">BestB4</ion-title>
        </ion-toolbar>
      </ion-header>

      <p v-if="sortedItems.length === 0" class="empty-message">
        No items yet. Tap + to add one.
      </p>

      <ion-list v-else>
        <ion-item-sliding v-for="item in sortedItems" :key="item.id">
          <ion-item-options side="start" @ionSwipe="toggleExpiryAndClose($event, item.id)">
            <ion-item-option
              :color="item.expiresOn ? 'medium' : 'success'"
              expandable
              @click="toggleExpiryAndClose($event, item.id)"
            >
              <ion-icon slot="icon-only" :icon="item.expiresOn ? notificationsOff : notifications" />
            </ion-item-option>
          </ion-item-options>

          <ion-item button :detail="false" @click="editItem(item.id)">
            <ion-label>{{ item.description }}</ion-label>
            <ion-chip v-if="item.expiresOn" slot="end" :color="expiryChip(item.expiresOn).color" :outline="true">
              {{ expiryChip(item.expiresOn).label }}
            </ion-chip>
          </ion-item>

          <ion-item-options side="end" @ionSwipe="removeItem(item.id)">
            <ion-item-option color="danger" expandable @click="removeItem(item.id)">
              <ion-icon slot="icon-only" :icon="trash" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button @click="newItem">
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import {
  add,
  ellipsisVertical,
  notifications,
  notificationsOff,
  settings,
  trash
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useItems } from '@/composables/useItems';
import { expiryChip } from '@/utils/expiry';

const router = useRouter();
const { sortedItems, toggleExpiry, removeItem } = useItems();

const newItem = () => router.push('/item/new');

const editItem = (id: number) => router.push(`/item/${id}`);

const openSettings = () => router.push('/settings');

/* Neither tapping an option nor a start-side full swipe closes the row, so close it here. */
const toggleExpiryAndClose = (event: Event, id: number): void => {
  void (event.currentTarget as Element).closest('ion-item-sliding')?.close();
  toggleExpiry(id);
};
</script>

<style scoped>
.empty-message {
  text-align: center;
  color: var(--ion-color-medium);
  margin-top: 40%;
}
</style>
