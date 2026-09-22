import { flushPromises, mount } from '@vue/test-utils'
import { IonChip, IonicVue, IonIcon, IonItem, IonItemOption, IonItemOptions } from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import { notifications, notificationsOff } from 'ionicons/icons'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HomePage from '@/views/HomePage.vue'
import { useItems } from '@/composables/useItems'
import { scheduleExpiryNotification } from '@/utils/notifications'

/* jsdom has no window.Notification, so the real plugin would reject on every store
   mutation; the reminder payload itself is covered in notifications.spec.ts. */
vi.mock('@/utils/notifications')

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
    addItem('Bread', 1)

    ;[rice, milk].forEach((item) => toggleExpiry(item.id))
    const wrapper = await mountHomePage()

    const rows = wrapper.findAllComponents(IonItem)
    expect(rows.map((row) => row.text())).toEqual(['Milktoday', 'Rice30', 'Bread'])
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
