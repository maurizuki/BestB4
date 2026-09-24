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
