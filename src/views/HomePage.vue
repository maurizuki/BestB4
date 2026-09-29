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
          <ion-item button :detail="false" @click="aboutOpen = true">
            <ion-icon slot="start" :icon="informationCircle" />
            <ion-label>About</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <!-- Driven by state, not a trigger: the menu item lives in the popover, which unmounts it. -->
    <ion-modal :is-open="aboutOpen" @didDismiss="aboutOpen = false">
      <about-modal @close="aboutOpen = false" />
    </ion-modal>

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

          <ion-item-options side="end" @ionSwipe="deleteItem(item.id)">
            <ion-item-option color="danger" expandable @click="deleteItem(item.id)">
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
  IonModal,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import {
  add,
  ellipsisVertical,
  informationCircle,
  notifications,
  notificationsOff,
  settings,
  trash
} from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AboutModal from '@/components/AboutModal.vue';
import { useItems } from '@/composables/useItems';
import { expiryChip } from '@/utils/expiry';
import { offerUndo } from '@/utils/toast';

const router = useRouter();
const { sortedItems, toggleExpiry, removeItem, restoreItem } = useItems();

const newItem = () => router.push('/item/new');

const editItem = (id: number) => router.push(`/item/${id}`);

const openSettings = () => router.push('/settings');

const aboutOpen = ref(false);

/* Neither tapping an option nor a start-side full swipe closes the row, so close it here. */
const toggleExpiryAndClose = (event: Event, id: number): void => {
  void (event.currentTarget as Element).closest('ion-item-sliding')?.close();
  toggleExpiry(id);
};

/* A full swipe fires both the swipe and the click; only the first finds anything to remove,
   so only one toast is offered. */
const deleteItem = (id: number): void => {
  const removed = removeItem(id);
  if (removed) {
    offerUndo(`"${removed.description}" deleted.`, () => restoreItem(removed));
  }
};
</script>

<style scoped>
.empty-message {
  text-align: center;
  color: var(--ion-color-medium);
  margin-top: 40%;
}

/* Ionic offsets a bottom fab by a fixed 10px, ignoring the edge-to-edge navigation bar. */
ion-fab.fab-vertical-bottom {
  bottom: calc(10px + var(--ion-safe-area-bottom, 0px));
}
</style>
