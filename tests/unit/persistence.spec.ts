import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Preferences } from '@capacitor/preferences'
import { syncNotifications } from '@/utils/notifications'
import { reportError } from '@/utils/toast'

/* jsdom has no window.Notification, so the real plugin would reject on every mutation.
   Preferences is deliberately NOT mocked: its web implementation wraps localStorage, which
   jsdom provides, so the JSON round-trip this feature is made of is genuinely exercised. */
vi.mock('@/utils/notifications')

/* Mocked modules survive vi.resetModules(), so these handles stay valid across restarts. */
vi.mock('@/utils/toast')

const synced = vi.mocked(syncNotifications)
const reported = vi.mocked(reportError)

const LOAD_FAILED = 'Your saved items could not be loaded.'

const STORAGE_KEY = 'items'

const settle = () => flushPromises()

/* Nothing from src/ is imported at the top of this file on purpose: the store is a
   module-level singleton, so only a fresh module is an honest simulation of a restart. */
const restart = async () => {
  vi.resetModules()
  const store = await import('@/composables/useItems')
  await store.loadItems()
  return store.useItems()
}

/* Read back through Preferences rather than localStorage: the web implementation prefixes
   the raw key with its group name, which is none of this spec's business. */
const stored = async () => {
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  return value === null ? null : JSON.parse(value)
}

describe('item persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await settle()
    vi.useRealTimers()
  })

  test('starts empty when nothing has been saved', async () => {
    const { items } = await restart()

    expect(items).toHaveLength(0)
  })

  test('restores the items saved before a restart', async () => {
    const before = await restart()
    before.addItem('Milk', 7)
    before.addItem('Bread', 3)
    await settle()

    const { items } = await restart()

    expect(items.map((item) => item.description)).toEqual(['Milk', 'Bread'])
    expect(items.map((item) => item.durationDays)).toEqual([7, 3])
  })

  test('restores the expiration dates saved before a restart', async () => {
    const before = await restart()
    const milk = before.addItem('Milk', 7)
    before.toggleExpiry(milk.id)
    before.addItem('Bread', 3)
    await settle()

    const { items } = await restart()

    expect(items.map((item) => item.expiresOn)).toEqual(['2026-09-29', null])
  })

  test('sorts the restored list on startup', async () => {
    const before = await restart()
    before.addItem('Bread', 3)
    const milk = before.addItem('Milk', 7)
    before.toggleExpiry(milk.id)
    await settle()

    const { sortedItems } = await restart()

    expect(sortedItems.value.map((item) => item.description)).toEqual(['Milk', 'Bread'])
  })

  test('does not hand a restored id to a new item', async () => {
    const before = await restart()
    const milk = before.addItem('Milk', 7)
    await settle()

    const after = await restart()
    const bread = after.addItem('Bread', 3)

    expect(bread.id).not.toBe(milk.id)
    expect(after.items.map((item) => item.id)).toEqual([milk.id, bread.id])
  })

  test('keeps handing out unique ids after a restart', async () => {
    const before = await restart()
    before.addItem('Milk', 7)
    before.addItem('Bread', 3)
    before.addItem('Rice', 30)
    await settle()

    const after = await restart()
    after.addItem('Flour', 30)
    after.addItem('Yoghurt', 5)

    const ids = after.items.map((item) => item.id)
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
  })

  test('saves the list when an item is added', async () => {
    const { addItem } = await restart()

    addItem('Milk', 7)
    await settle()

    expect(await stored()).toEqual([
      expect.objectContaining({ description: 'Milk', durationDays: 7, expiresOn: null })
    ])
  })

  test('saves the list when an item is removed', async () => {
    const { addItem, removeItem } = await restart()
    const milk = addItem('Milk', 7)
    addItem('Bread', 3)
    await settle()

    removeItem(milk.id)
    await settle()

    expect(await stored()).toEqual([expect.objectContaining({ description: 'Bread' })])
  })

  test('saves the list when the expiration is toggled', async () => {
    const { addItem, toggleExpiry } = await restart()
    const milk = addItem('Milk', 7)
    await settle()

    toggleExpiry(milk.id)
    await settle()

    expect(await stored()).toEqual([expect.objectContaining({ expiresOn: '2026-09-29' })])
  })

  test('saves the list when an item is renamed', async () => {
    const { addItem, updateItem } = await restart()
    const milk = addItem('Milk', 7)
    await settle()

    updateItem(milk.id, 'Semi-skimmed milk', 3)
    await settle()

    expect(await stored()).toEqual([
      expect.objectContaining({ description: 'Semi-skimmed milk', durationDays: 3 })
    ])
  })

  test('starts empty and tells the user when the saved list cannot be parsed', async () => {
    await Preferences.set({ key: STORAGE_KEY, value: 'not json' })

    const { items } = await restart()

    expect(items).toHaveLength(0)
    expect(reported).toHaveBeenCalledWith(LOAD_FAILED, expect.any(SyntaxError))
  })

  test('starts empty and tells the user when the saved list is not an array', async () => {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({ description: 'Milk' }) })

    const { items } = await restart()

    expect(items).toHaveLength(0)
    expect(reported).toHaveBeenCalledWith(LOAD_FAILED, expect.any(Error))
  })

  test('tells the user when the list cannot be saved, and keeps it in memory', async () => {
    const { addItem, items } = await restart()
    /* Preferences is a plugin proxy with no real method to spy on, so the failure is made
       where it would really happen: the storage behind it running out of room. */
    const failure = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw failure
    })

    addItem('Milk', 7)
    await settle()

    expect(reported).toHaveBeenCalledWith('Your changes could not be saved.', failure)
    expect(items.map((item) => item.description)).toEqual(['Milk'])
    setItem.mockRestore()
  })

  test('says nothing when loading and saving succeed', async () => {
    const { addItem } = await restart()

    addItem('Milk', 7)
    await settle()

    expect(reported).not.toHaveBeenCalled()
  })

  test('re-applies the reminders of the restored list', async () => {
    const before = await restart()
    const milk = before.addItem('Milk', 7)
    before.toggleExpiry(milk.id)
    await settle()
    vi.clearAllMocks()

    await restart()

    expect(synced).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Milk', expiresOn: '2026-09-29' })
    ])
  })
})
