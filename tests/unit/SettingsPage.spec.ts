import { flushPromises, mount } from '@vue/test-utils'
import { IonBackButton, IonicVue, IonRadio, IonRadioGroup } from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SettingsPage from '@/views/SettingsPage.vue'
import { useTheme } from '@/composables/useTheme'

vi.mock('@/utils/toast')

const { setTheme } = useTheme()

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: SettingsPage }]
})

const mountSettingsPage = async () => {
  await router.push('/settings')
  await router.isReady()
  return mount(SettingsPage, { global: { plugins: [IonicVue, router] } })
}

const isDark = () => document.documentElement.classList.contains('ion-palette-dark')

describe('SettingsPage.vue', () => {
  beforeEach(async () => {
    /* jsdom has no matchMedia; a light system keeps Auto distinguishable from Dark. */
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined }))
    setTheme('auto')
    await flushPromises()
    localStorage.clear()
  })

  afterEach(async () => {
    await flushPromises()
    vi.unstubAllGlobals()
  })

  test('offers Auto, Light and Dark', async () => {
    const wrapper = await mountSettingsPage()

    const radios = wrapper.findAllComponents(IonRadio)
    expect(radios.map((radio) => radio.props('value'))).toEqual(['auto', 'light', 'dark'])
    expect(radios.map((radio) => radio.text())).toEqual(['Auto', 'Light', 'Dark'])
  })

  test('checks the theme currently in use', async () => {
    setTheme('light')

    const wrapper = await mountSettingsPage()

    expect(wrapper.findComponent(IonRadioGroup).props('value')).toBe('light')
  })

  test('applies a choice the moment it is made', async () => {
    const wrapper = await mountSettingsPage()

    wrapper
      .findComponent(IonRadioGroup)
      .element.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'dark' } }))
    await flushPromises()

    expect(isDark()).toBe(true)
    expect(wrapper.findComponent(IonRadioGroup).props('value')).toBe('dark')
  })

  /* Opened directly, so there is no history to go back through: the default has to lead home. */
  test('leads back to the home page', async () => {
    const wrapper = await mountSettingsPage()

    await wrapper.findComponent(IonBackButton).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
  })
})
