import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Preferences } from '@capacitor/preferences'
import { reportError } from '@/utils/toast'

/* Mocked modules survive vi.resetModules(), so this handle stays valid across restarts. */
vi.mock('@/utils/toast')

const reported = vi.mocked(reportError)

const settle = () => flushPromises()

/* The time is module-level state, so only a fresh module is an honest restart. */
const restart = async () => {
  vi.resetModules()
  const store = await import('@/composables/useReminderTime')
  await store.loadReminderTime()
  return store.useReminderTime()
}

describe('useReminderTime', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => settle())

  test('defaults to 09:00', async () => {
    const { reminderTime } = await restart()

    expect(reminderTime.value).toBe('09:00')
  })

  test('applies a new time straight away', async () => {
    const { reminderTime, setReminderTime } = await restart()

    setReminderTime('07:30')

    expect(reminderTime.value).toBe('07:30')
  })

  test.each(['00:00', '06:15', '12:30', '23:45'])(
    'accepts the quarter hour %j',
    async (time) => {
      const { isReminderTime } = await import('@/composables/useReminderTime')

      expect(isReminderTime(time)).toBe(true)
    }
  )

  test('restores the saved time after a restart', async () => {
    const before = await restart()
    before.setReminderTime('18:45')
    await settle()

    const { reminderTime } = await restart()

    expect(reminderTime.value).toBe('18:45')
  })

  test.each(['9:00', '24:00', '07:60', '07:29', '07:05', '7', 'soon'])(
    'falls back to 09:00 when the saved time is %j',
    async (stored) => {
      await Preferences.set({ key: 'reminderTime', value: stored })

      const { reminderTime } = await restart()

      expect(reminderTime.value).toBe('09:00')
      expect(reported).not.toHaveBeenCalled()
    }
  )

  test('keeps the new time and tells the user when it cannot be saved', async () => {
    const { reminderTime, setReminderTime } = await restart()
    /* Preferences is a plugin proxy with no real method to spy on, so the failure is made
       where it would really happen: the storage behind it running out of room. */
    const failure = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw failure
    })

    setReminderTime('07:30')
    await settle()

    expect(reminderTime.value).toBe('07:30')
    expect(reported).toHaveBeenCalledWith('Your settings could not be saved.', failure)
    setItem.mockRestore()
  })
})
