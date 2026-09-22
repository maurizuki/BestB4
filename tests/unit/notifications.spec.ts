import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  cancelExpiryNotification,
  scheduleExpiryNotification,
  syncNotifications
} from '@/utils/notifications'
import type { Item } from '@/composables/useItems'

/* jsdom has no window.Notification, so the plugin's own web implementation rejects every
   call. Mocking it is also the only way to observe what would have been scheduled. */
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(async () => undefined)
  }
}))

const schedule = vi.mocked(LocalNotifications.schedule)
const cancel = vi.mocked(LocalNotifications.cancel)

/* Only Date is faked, so setImmediate stays real and flushPromises() actually resolves. */
const settle = () => flushPromises()

const anItem = (overrides: Partial<Item> = {}): Item => ({
  id: 42,
  description: 'Milk',
  durationDays: 7,
  expiresOn: '2026-09-29',
  ...overrides
})

describe('notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await settle()
    vi.useRealTimers()
  })

  test('schedules at 09:00 on the expiration date', async () => {
    scheduleExpiryNotification(anItem())
    await settle()

    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 42,
          title: 'Milk',
          body: 'Best before today.',
          schedule: { at: new Date(2026, 8, 29, 9, 0, 0, 0) }
        }
      ]
    })
  })

  test('titles the notification with the item description', async () => {
    scheduleExpiryNotification(anItem({ description: 'Semi-skimmed milk' }))
    await settle()

    expect(schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ title: 'Semi-skimmed milk' })]
    })
  })

  test('schedules for later today when 09:00 has not arrived yet', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 8, 59))

    scheduleExpiryNotification(anItem({ expiresOn: '2026-09-22' }))
    await settle()

    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({ schedule: { at: new Date(2026, 8, 22, 9, 0, 0, 0) } })
      ]
    })
  })

  test('does not schedule when 09:00 today has already passed', async () => {
    scheduleExpiryNotification(anItem({ expiresOn: '2026-09-22' }))
    await settle()

    expect(schedule).not.toHaveBeenCalled()
  })

  test('does not schedule when 09:00 is exactly now', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 9, 0, 0, 0))

    scheduleExpiryNotification(anItem({ expiresOn: '2026-09-22' }))
    await settle()

    expect(schedule).not.toHaveBeenCalled()
  })

  test('does not schedule when the expiration date has gone by', async () => {
    scheduleExpiryNotification(anItem({ expiresOn: '2026-09-19' }))
    await settle()

    expect(schedule).not.toHaveBeenCalled()
  })

  test('does not schedule an item without an expiration date', async () => {
    scheduleExpiryNotification(anItem({ expiresOn: null }))
    await settle()

    expect(schedule).not.toHaveBeenCalled()
  })

  test('cancels the notification of an item', async () => {
    cancelExpiryNotification(anItem())
    await settle()

    expect(cancel).toHaveBeenCalledWith({ notifications: [{ id: 42 }] })
  })

  test('reports a failing plugin without throwing', async () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    schedule.mockRejectedValueOnce(new Error('Notifications not supported in this browser.'))

    expect(() => scheduleExpiryNotification(anItem())).not.toThrow()
    await settle()

    expect(reportError).toHaveBeenCalled()
    reportError.mockRestore()
  })

  describe('syncNotifications', () => {
    test('batches every schedulable item into one call', async () => {
      syncNotifications([
        anItem({ id: 1, description: 'Milk', expiresOn: '2026-09-29' }),
        anItem({ id: 2, description: 'Bread', expiresOn: '2026-09-23' })
      ])
      await settle()

      expect(schedule).toHaveBeenCalledOnce()
      expect(schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({ id: 1, title: 'Milk' }),
          expect.objectContaining({ id: 2, title: 'Bread' })
        ]
      })
    })

    test('leaves out the items that have nothing to schedule', async () => {
      syncNotifications([
        anItem({ id: 1, expiresOn: null }),
        anItem({ id: 2, expiresOn: '2026-09-22' }),
        anItem({ id: 3, expiresOn: '2026-09-29' })
      ])
      await settle()

      expect(schedule).toHaveBeenCalledWith({
        notifications: [expect.objectContaining({ id: 3 })]
      })
    })

    /* Calling schedule() is what raises the permission prompt, and that prompt belongs to
       the first bell tap rather than to a cold start with nothing dated. */
    test('does not reach the plugin when no item has a reminder due', async () => {
      syncNotifications([anItem({ id: 1, expiresOn: null }), anItem({ id: 2, expiresOn: null })])
      await settle()

      expect(schedule).not.toHaveBeenCalled()
    })
  })
})
