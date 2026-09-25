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
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { App } from '@capacitor/app';

const ionRouter = useIonRouter();

/* Ionic handles Back inside the app, but not on the first page: there it would do nothing,
   whereas Android apps are expected to close. Priority -1, so overlays and in-app navigation
   still get the button first. */
useBackButton(-1, () => {
  if (!ionRouter.canGoBack()) {
    void App.exitApp();
  }
});
</script>
