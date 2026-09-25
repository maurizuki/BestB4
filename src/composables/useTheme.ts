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

import { readonly, ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { reportError } from '@/utils/toast';

export type Theme = 'auto' | 'light' | 'dark';

/* Preferences namespaces its keys, so this one only has to be unique within the app. */
const STORAGE_KEY = 'theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const theme = ref<Theme>('auto');

const isTheme = (value: unknown): value is Theme =>
  value === 'auto' || value === 'light' || value === 'dark';

/* Called on every change and whenever the OS scheme flips, so Auto keeps following it.
   matchMedia is only touched in here, never at module scope, because jsdom lacks it. */
const apply = (): void => {
  const dark =
    theme.value === 'dark' || (theme.value === 'auto' && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle('ion-palette-dark', dark);
  /* Scrollbars and native form controls follow color-scheme, not Ionic's palette. Empty hands
     it back to the <meta name="color-scheme" content="light dark"> in index.html. */
  document.documentElement.style.colorScheme = theme.value === 'auto' ? '' : theme.value;
};

/* Awaited before mount so the first frame is already in the right scheme. */
export const loadTheme = async (): Promise<void> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    /* Anything unrecognised falls back to Auto: a garbled preference is not something the
       user could act on. */
    if (isTheme(value)) {
      theme.value = value;
    }
  } catch (error) {
    reportError('Your settings could not be loaded.', error);
  }

  apply();
  window.matchMedia(DARK_QUERY).addEventListener('change', apply);
};

export function useTheme() {
  /* Applied before it is saved, so the change is immediate whether or not the write lands. */
  const setTheme = (next: Theme): void => {
    theme.value = next;
    apply();
    void Preferences.set({ key: STORAGE_KEY, value: next }).catch((error: unknown) =>
      reportError('Your settings could not be saved.', error)
    );
  };

  return { theme: readonly(theme), setTheme };
}
