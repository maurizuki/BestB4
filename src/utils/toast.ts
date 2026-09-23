import { toastController } from '@ionic/vue';

/* Toasts at the same position overlap rather than stack, so a newer message replaces
   whatever is showing. */
const present = async (message: string): Promise<void> => {
  try {
    await (await toastController.getTop())?.dismiss();
    const toast = await toastController.create({
      message,
      color: 'danger',
      position: 'bottom',
      duration: 5000,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  } catch (error) {
    /* With the toast itself broken there is nowhere left to tell the user. */
    console.error('The error toast could not be shown.', error);
  }
};

/* The toast carries what the user can act on; the error itself goes to the console, where a
   developer can find it. Fire and forget, so no caller has to wait on an animation. */
export const reportError = (message: string, error?: unknown): void => {
  if (error !== undefined) {
    console.error(message, error);
  }
  void present(message);
};
