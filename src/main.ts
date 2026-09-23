import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { loadItems } from './composables/useItems';
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
   before anything mounts; the theme too, so the first frame is not in the wrong scheme. */
Promise.all([router.isReady(), loadItems(), loadTheme()]).then(() => {
  app.mount('#app');
});
