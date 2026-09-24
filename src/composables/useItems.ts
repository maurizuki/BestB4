import { computed, reactive, readonly, ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { addDays, today } from '@/utils/expiry';
import {
  cancelExpiryNotification,
  rescheduleReminders as rescheduleRemindersFor,
  scheduleExpiryNotification,
  syncNotifications
} from '@/utils/notifications';
import { reportError } from '@/utils/toast';

export interface Item {
  /* Numeric because it doubles as the notification id, which Android requires to be a
     32-bit signed int. */
  id: number;
  description: string;
  durationDays: number;
  /* Local 'YYYY-MM-DD', or null while the item has not been opened. */
  expiresOn: string | null;
}

/* Preferences namespaces its keys, so this one only has to be unique within the app. */
const STORAGE_KEY = 'items';

/* Hydrated from storage before the app mounts; every mutation writes it back. */
const items = reactive<Item[]>([]);

let nextId = 0;

/* Pre-increment, so no item ever gets the falsy id 0. */
const createId = (): number => ++nextId;

/* Fire and forget: the list is already correct in memory, so nothing in the UI has to wait
   for the write - but a write that fails is reported rather than swallowed. */
const save = (): void => {
  void Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(items) }).catch(
    (error: unknown) => reportError('Your changes could not be saved.', error)
  );
};

/* Awaited before the app mounts, because ItemEditPage looks its item up synchronously at
   setup and would otherwise render a new-item form over an existing item. */
export const loadItems = async (): Promise<void> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value !== null) {
      const stored: unknown = JSON.parse(value);
      if (!Array.isArray(stored)) {
        throw new Error('The stored item list is not an array.');
      }
      items.splice(0, items.length, ...(stored as Item[]));
      /* Ids must resume past every stored one, or a new item would reuse the id - and with
         it the notification - of an existing one. */
      nextId = items.reduce((highest, item) => Math.max(highest, item.id), 0);
    }
  } catch (error) {
    /* Unreadable storage costs the user their list; it must not also cost them the app. */
    reportError('Your saved items could not be loaded.', error);
  }

  resort();
  syncNotifications(items);
};

/* Soonest expiration first, then alphabetically; items without a date come last. */
const byExpiryThenDescription = (a: Item, b: Item): number => {
  if (a.expiresOn !== b.expiresOn) {
    if (a.expiresOn === null) {
      return 1;
    }
    if (b.expiresOn === null) {
      return -1;
    }
    return a.expiresOn < b.expiresOn ? -1 : 1;
  }
  return a.description.localeCompare(b.description);
};

/* The display order, as ids. Deliberately not a live sort: it is only recomputed on load, add
   and edit, so a row does not jump out from under the user's finger when they swipe its date
   on or off, or delete a neighbour. */
const order = ref<number[]>([]);

const resort = (): void => {
  order.value = [...items].sort(byExpiryThenDescription).map((item) => item.id);
};

/* Maps the frozen order onto the live items, so a toggled row shows its new chip in place and
   a removed one simply drops out. */
const sortedItems = computed(() => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return order.value.flatMap((id) => byId.get(id) ?? []);
});

export function useItems() {
  const addItem = (description: string, durationDays: number): Item => {
    const item: Item = {
      id: createId(),
      description: description.trim(),
      durationDays,
      expiresOn: null
    };
    items.push(item);
    resort();
    save();
    return item;
  };

  const getItem = (id: number): Item | undefined => items.find((item) => item.id === id);

  const updateItem = (id: number, description: string, durationDays: number): void => {
    const item = getItem(id);
    if (!item) {
      return;
    }
    item.description = description.trim();
    item.durationDays = durationDays;
    resort();
    save();
    /* Scheduling under an id that is already pending replaces it, so this is how a renamed
       item gets new notification text. The new duration deliberately does not move a date
       that is already set. */
    if (item.expiresOn !== null) {
      scheduleExpiryNotification(item);
    }
  };

  /* Sets the expiration to today plus the item's duration, or clears it if already set. */
  const toggleExpiry = (id: number): void => {
    const item = getItem(id);
    if (!item) {
      return;
    }
    item.expiresOn = item.expiresOn === null ? addDays(today(), item.durationDays) : null;
    save();
    if (item.expiresOn === null) {
      cancelExpiryNotification(item);
    } else {
      scheduleExpiryNotification(item);
    }
  };

  const removeItem = (id: number): void => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const [removed] = items.splice(index, 1);
    save();
    if (removed.expiresOn !== null) {
      cancelExpiryNotification(removed);
    }
  };

  /* For when the reminder time changes: every pending reminder has to follow it. */
  const rescheduleReminders = (): void => rescheduleRemindersFor(items);

  return {
    items: readonly(items),
    sortedItems,
    addItem,
    getItem,
    updateItem,
    toggleExpiry,
    removeItem,
    rescheduleReminders
  };
}
