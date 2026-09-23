import { flushPromises, mount } from '@vue/test-utils'
import {
  IonBackButton,
  IonDatetime,
  IonDatetimeButton,
  IonicVue,
  IonRadio,
  IonRadioGroup
} from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SettingsPage from '@/views/SettingsPage.vue'
import { useReminderTime } from '@/composables/useReminderTime'
import { useTheme } from '@/composables/useTheme'
import { rescheduleReminders } from '@/utils/notifications'

vi.mock('@/utils/toast')

/* The plugin behind it has no jsdom implementation; what matters here is that the page asks
   for the reminders to follow a new time. */
vi.mock('@/utils/notifications')

const rescheduled = vi.mocked(rescheduleReminders)

const { setTheme } = useTheme()
const { reminderTime, setReminderTime } = useReminderTime()

/* jsdom lacks IntersectionObserver, which datetime and its wheels construct on load. */
class NoIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const chooseTime = (wrapper: Awaited<ReturnType<typeof mountSettingsPage>>, value: unknown) =>
  wrapper
    .findComponent(IonDatetime)
    .element.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }))

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
    vi.stubGlobal('IntersectionObserver', NoIntersectionObserver)
    setTheme('auto')
    setReminderTime('09:00')
    await flushPromises()
    localStorage.clear()
    vi.clearAllMocks()
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

  describe('reminder time', () => {
    test('opens a time picker showing 09:00 by default', async () => {
      const wrapper = await mountSettingsPage()

      const datetime = wrapper.findComponent(IonDatetime)
      expect(wrapper.findComponent(IonDatetimeButton).props('datetime')).toBe('reminder-time')
      expect(datetime.attributes('id')).toBe('reminder-time')
      expect(datetime.props('presentation')).toBe('time')
      expect(datetime.props('value')).toBe('09:00')
    })

    test('offers quarter hours only', async () => {
      const wrapper = await mountSettingsPage()

      expect(wrapper.findComponent(IonDatetime).props('minuteValues')).toEqual([0, 15, 30, 45])
    })

    test('ignores a time that is not on a quarter hour', async () => {
      const wrapper = await mountSettingsPage()

      chooseTime(wrapper, '07:29')
      await flushPromises()

      expect(reminderTime.value).toBe('09:00')
      expect(rescheduled).not.toHaveBeenCalled()
    })

    test('applies a chosen time and moves the reminders to it', async () => {
      /* Rescheduling reads the time, so it must already hold the new one by then. */
      let timeWhenRescheduled: string | undefined
      rescheduled.mockImplementationOnce(() => {
        timeWhenRescheduled = reminderTime.value
      })
      const wrapper = await mountSettingsPage()

      chooseTime(wrapper, '07:30')
      await flushPromises()

      expect(reminderTime.value).toBe('07:30')
      expect(wrapper.findComponent(IonDatetime).props('value')).toBe('07:30')
      expect(rescheduled).toHaveBeenCalledOnce()
      expect(timeWhenRescheduled).toBe('07:30')
    })

    test('keeps only the time of a full date-time value', async () => {
      const wrapper = await mountSettingsPage()

      chooseTime(wrapper, '2026-09-23T07:30:00')
      await flushPromises()

      expect(reminderTime.value).toBe('07:30')
    })

    test('ignores a cleared value', async () => {
      const wrapper = await mountSettingsPage()

      chooseTime(wrapper, undefined)
      await flushPromises()

      expect(reminderTime.value).toBe('09:00')
      expect(rescheduled).not.toHaveBeenCalled()
    })
  })

  /* Opened directly, so there is no history to go back through: the default has to lead home. */
  test('leads back to the home page', async () => {
    const wrapper = await mountSettingsPage()

    await wrapper.findComponent(IonBackButton).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
  })
})
