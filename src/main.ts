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

import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { loadItems } from './composables/useItems';
import { loadReminderTime } from './composables/useReminderTime';
import { loadTheme } from './composables/useTheme';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* The class palette, not the system one: dark applies only while useTheme puts
   .ion-palette-dark on <html>, which is what lets Light and Dark override the OS. */
import '@ionic/vue/css/palettes/dark.class.css';

/* Theme variables */
import './theme/variables.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

/* ItemEditPage looks its item up synchronously at setup, so the list has to be hydrated
   before anything mounts; the theme too, so the first frame is not in the wrong scheme.
   The reminder time goes before the items: loading them re-arms the reminders, which reads
   it - run in parallel, they would be re-armed at the default time. */
Promise.all([router.isReady(), loadReminderTime().then(loadItems), loadTheme()]).then(() => {
  app.mount('#app');
});
