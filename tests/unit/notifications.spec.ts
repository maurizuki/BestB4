import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  cancelExpiryNotification,
  scheduleExpiryNotification,
  syncNotifications
} from '@/utils/notifications'
import type { Item } from '@/composables/useItems'
import { reportError } from '@/utils/toast'

/* jsdom has no window.Notification, so the plugin's own web implementation rejects every
   call. Mocking it is also the only way to observe what would have been scheduled.
   Implementations are passed to vi.fn() so clearAllMocks() keeps them. */
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn(async () => ({ display: 'granted' as const })),
    checkPermissions: vi.fn(async () => ({ display: 'granted' as const })),
    schedule: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(async () => undefined)
  }
}))

vi.mock('@/utils/toast')

const requestPermissions = vi.mocked(LocalNotifications.requestPermissions)
const checkPermissions = vi.mocked(LocalNotifications.checkPermissions)
const schedule = vi.mocked(LocalNotifications.schedule)
const cancel = vi.mocked(LocalNotifications.cancel)
const reported = vi.mocked(reportError)

const NOT_ALLOWED = 'Notifications are not allowed, so no reminder will be shown.'

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
          schedule: { at: new Date(2026, 8, 29, 9, 0, 0, 0) },
          isExactNotification: false
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

  test('reports a failing plugin to the user without throwing', async () => {
    const failure = new Error('Notifications not supported in this browser.')
    schedule.mockRejectedValueOnce(failure)

    expect(() => scheduleExpiryNotification(anItem())).not.toThrow()
    await settle()

    expect(reported).toHaveBeenCalledWith('The reminder could not be updated.', failure)
  })

  describe('permission', () => {
    test('asks for it before scheduling', async () => {
      scheduleExpiryNotification(anItem())
      await settle()

      expect(requestPermissions).toHaveBeenCalledOnce()
      expect(requestPermissions.mock.invocationCallOrder[0]).toBeLessThan(
        schedule.mock.invocationCallOrder[0]
      )
    })

    test('schedules nothing and tells the user when it is denied', async () => {
      requestPermissions.mockResolvedValueOnce({ display: 'denied' })

      scheduleExpiryNotification(anItem())
      await settle()

      expect(schedule).not.toHaveBeenCalled()
      expect(reported).toHaveBeenCalledWith(NOT_ALLOWED)
    })

    /* On web, dismissing the browser prompt leaves the permission undecided, not denied. */
    test('treats a dismissed prompt like a denial', async () => {
      requestPermissions.mockResolvedValueOnce({ display: 'prompt' })

      scheduleExpiryNotification(anItem())
      await settle()

      expect(schedule).not.toHaveBeenCalled()
      expect(reported).toHaveBeenCalledWith(NOT_ALLOWED)
    })

    test('is not asked for when there is nothing to schedule', async () => {
      scheduleExpiryNotification(anItem({ expiresOn: null }))
      await settle()

      expect(requestPermissions).not.toHaveBeenCalled()
    })
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

      expect(checkPermissions).not.toHaveBeenCalled()
      expect(schedule).not.toHaveBeenCalled()
    })

    /* A launch is not a user action, so it must never raise the permission prompt. */
    test('checks the permission without asking for it', async () => {
      syncNotifications([anItem()])
      await settle()

      expect(checkPermissions).toHaveBeenCalledOnce()
      expect(requestPermissions).not.toHaveBeenCalled()
    })

    test('skips silently when the permission is not granted', async () => {
      checkPermissions.mockResolvedValueOnce({ display: 'denied' })

      syncNotifications([anItem()])
      await settle()

      expect(schedule).not.toHaveBeenCalled()
      expect(reported).not.toHaveBeenCalled()
    })
  })
})
