import { flushPromises, mount } from '@vue/test-utils'
import {
  IonChip,
  IonicVue,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonModal,
  IonPopover
} from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import { notifications, notificationsOff } from 'ionicons/icons'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HomePage from '@/views/HomePage.vue'
import { useItems } from '@/composables/useItems'
import { scheduleExpiryNotification } from '@/utils/notifications'

/* jsdom has no window.Notification, so the real plugin would reject on every store
   mutation; the reminder payload itself is covered in notifications.spec.ts. */
vi.mock('@/utils/notifications')

/* The about modal reads the app version through it; a factory, as the plugin is a proxy. */
vi.mock('@capacitor/app', () => ({ App: { getInfo: vi.fn(() => Promise.resolve({ version: '0.3' })) } }))

const scheduled = vi.mocked(scheduleExpiryNotification)

const { items, addItem, toggleExpiry, removeItem } = useItems()

/* Only Date is faked, so setImmediate stays real and flushPromises() actually resolves. */
const settle = () => flushPromises()

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: HomePage }]
})

const mountHomePage = async () => {
  await router.push('/home')
  await router.isReady()
  return mount(HomePage, { global: { plugins: [IonicVue, router] } })
}

describe('HomePage.vue', () => {
  beforeEach(async () => {
    /* The clock goes first: draining the list fires date-dependent work. */
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
    items.map((item) => item.id).forEach(removeItem)
    /* Let the drain's saves land before wiping the slate and forgetting its calls. */
    await settle()
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await settle()
    vi.useRealTimers()
  })

  test('invites the user to add an item when the list is empty', async () => {
    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain('No items yet')
  })

  test('lists the description of every item', async () => {
    addItem('Milk', 3)
    addItem('Bread', 1)

    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain('Milk')
    expect(wrapper.text()).toContain('Bread')
    expect(wrapper.text()).not.toContain('No items yet')
  })

  test('shows a chip only for items with an expiration', async () => {
    const milk = addItem('Milk', 3)
    addItem('Bread', 1)

    toggleExpiry(milk.id)
    const wrapper = await mountHomePage()

    const chips = wrapper.findAllComponents(IonChip)
    expect(chips).toHaveLength(1)
    expect(chips[0].text()).toBe('3')
    expect(chips[0].props('color')).toBe('success')
  })

  test('renders dated items first, in expiration order', async () => {
    const rice = addItem('Rice', 30)
    const milk = addItem('Milk', 0)
    ;[rice, milk].forEach((item) => toggleExpiry(item.id))
    addItem('Bread', 1)

    const wrapper = await mountHomePage()

    const rows = wrapper.findAllComponents(IonItem)
    expect(rows.map((row) => row.text())).toEqual(['Milktoday', 'Rice30', 'Bread'])
  })

  test('keeps a row in place when its expiration is set', async () => {
    addItem('Bread', 1)
    addItem('Milk', 3)

    const wrapper = await mountHomePage()
    wrapper.findAll('ion-item-sliding').forEach((row) => {
      row.element.close = vi.fn(() => Promise.resolve())
    })

    const milkStartOptions = wrapper
      .findAllComponents(IonItemOptions)
      .filter((options) => options.props('side') === 'start')[1]
    await milkStartOptions.findComponent(IonItemOption).trigger('click')

    const rows = wrapper.findAllComponents(IonItem)
    expect(rows.map((row) => row.text())).toEqual(['Bread', 'Milk3'])
  })

  test('offers a bell to start the countdown and a crossed-out bell to clear it', async () => {
    const milk = addItem('Milk', 3)
    addItem('Bread', 1)

    toggleExpiry(milk.id)
    const wrapper = await mountHomePage()

    const icons = wrapper.findAllComponents(IonIcon).map((icon) => icon.props('icon'))
    expect(icons).toContain(notificationsOff)
    expect(icons).toContain(notifications)
  })

  test('toggles the expiration and closes the row when the start option is tapped', async () => {
    addItem('Milk', 3)

    const wrapper = await mountHomePage()

    /* The test renderer mounts detached, so the real close() never connects and does nothing. */
    const close = vi.fn(() => Promise.resolve())
    wrapper.find('ion-item-sliding').element.close = close

    const [startOptions] = wrapper
      .findAllComponents(IonItemOptions)
      .filter((options) => options.props('side') === 'start')
    await startOptions.findComponent(IonItemOption).trigger('click')

    const chips = wrapper.findAllComponents(IonChip)
    expect(chips).toHaveLength(1)
    expect(chips[0].text()).toBe('3')
    expect(close).toHaveBeenCalledOnce()
  })

  test('has a menu button that opens the menu', async () => {
    const wrapper = await mountHomePage()

    const button = wrapper.find('#home-menu')
    expect(button.exists()).toBe(true)
    expect(wrapper.findComponent(IonPopover).props('trigger')).toBe('home-menu')
  })

  test('offers Settings in the menu, and choosing it opens the settings page', async () => {
    await router.push('/home')
    await router.isReady()
    /* Attached, unlike the other tests: the popover finds its trigger by id in the document
       and only mounts its content once it is actually presented. */
    const wrapper = mount(HomePage, {
      global: { plugins: [IonicVue, router] },
      attachTo: document.body
    })
    const push = vi.spyOn(router, 'push')

    await wrapper.find('#home-menu').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.findComponent(IonPopover).text()).toContain('Settings')
    })
    const settingsEntry = wrapper
      .findComponent(IonPopover)
      .findAllComponents(IonItem)
      .find((item) => item.text() === 'Settings')
    await settingsEntry?.trigger('click')

    expect(push).toHaveBeenCalledWith('/settings')
    push.mockRestore()
    wrapper.unmount()
  })

  test('offers About in the menu, and choosing it opens the about modal', async () => {
    await router.push('/home')
    await router.isReady()
    /* Attached for the same reason as the Settings test above. */
    const wrapper = mount(HomePage, {
      global: { plugins: [IonicVue, router] },
      attachTo: document.body
    })
    expect(wrapper.findComponent(IonModal).props('isOpen')).toBe(false)

    await wrapper.find('#home-menu').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.findComponent(IonPopover).text()).toContain('About')
    })
    const aboutEntry = wrapper
      .findComponent(IonPopover)
      .findAllComponents(IonItem)
      .find((item) => item.text() === 'About')
    await aboutEntry?.trigger('click')

    expect(wrapper.findComponent(IonModal).props('isOpen')).toBe(true)
    wrapper.unmount()
  })

  test('schedules a reminder when the start option is tapped', async () => {
    const milk = addItem('Milk', 3)

    const wrapper = await mountHomePage()
    wrapper.find('ion-item-sliding').element.close = vi.fn(() => Promise.resolve())

    const [startOptions] = wrapper
      .findAllComponents(IonItemOptions)
      .filter((options) => options.props('side') === 'start')
    await startOptions.findComponent(IonItemOption).trigger('click')

    expect(scheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: milk.id, description: 'Milk', expiresOn: '2026-09-25' })
    )
  })
})
