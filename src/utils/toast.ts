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

import { toastController, type ToastOptions } from '@ionic/vue';
import { close } from 'ionicons/icons';

/* Toasts at the same position overlap rather than stack, so a newer message replaces
   whatever is showing. */
const present = async (options: ToastOptions): Promise<void> => {
  try {
    await (await toastController.getTop())?.dismiss();
    const toast = await toastController.create({ position: 'bottom', duration: 5000, ...options });
    await toast.present();
  } catch (error) {
    /* With the toast itself broken there is nowhere left to tell the user. */
    console.error('The toast could not be shown.', error);
  }
};

/* The toast carries what the user can act on; the error itself goes to the console, where a
   developer can find it. Fire and forget, so no caller has to wait on an animation. */
export const reportError = (message: string, error?: unknown): void => {
  if (error !== undefined) {
    console.error(message, error);
  }
  void present({ message, color: 'danger', buttons: [{ text: 'OK', role: 'cancel' }] });
};

/* Confirms an action that is already done, with a way to take it back until the toast goes. */
export const offerUndo = (message: string, undo: () => void): void => {
  void present({
    message,
    buttons: [
      { text: 'Undo', handler: undo },
      { icon: close, role: 'cancel', htmlAttributes: { 'aria-label': 'Dismiss' } }
    ]
  });
};
