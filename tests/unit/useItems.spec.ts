import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useItems } from '@/composables/useItems'
import {
  cancelExpiryNotification,
  rescheduleReminders as rescheduleRemindersFor,
  scheduleExpiryNotification
} from '@/utils/notifications'

/* The store's contract is which reminder calls it makes, not what the plugin does with
   them; the payload itself is covered in notifications.spec.ts. */
vi.mock('@/utils/notifications')

const scheduled = vi.mocked(scheduleExpiryNotification)
const cancelled = vi.mocked(cancelExpiryNotification)
const rescheduled = vi.mocked(rescheduleRemindersFor)

const {
  items,
  sortedItems,
  addItem,
  getItem,
  updateItem,
  toggleExpiry,
  removeItem,
  restoreItem,
  rescheduleReminders
} = useItems()

/* Only Date is faked, so setImmediate stays real and flushPromises() actually resolves. */
const settle = () => flushPromises()

describe('useItems', () => {
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

  test('starts empty', () => {
    expect(items).toHaveLength(0)
  })

  test('adds an item with a unique id and no expiration', () => {
    const first = addItem('Milk', 7)
    const second = addItem('Bread', 3)

    expect(items.map((item) => item.description)).toEqual(['Milk', 'Bread'])
    expect(first.id).not.toBe(second.id)
    expect(first).toMatchObject({ durationDays: 7, expiresOn: null })
  })

  test('trims the description when adding', () => {
    expect(addItem('  Milk  ', 7).description).toBe('Milk')
  })

  test('finds an item by id', () => {
    const item = addItem('Milk', 7)

    expect(getItem(item.id)?.description).toBe('Milk')
    expect(getItem(0)).toBeUndefined()
  })

  test('updates the description and the duration of an existing item', () => {
    const item = addItem('Milk', 7)

    updateItem(item.id, '  Semi-skimmed milk  ', 3)

    expect(getItem(item.id)).toMatchObject({ description: 'Semi-skimmed milk', durationDays: 3 })
  })

  test('ignores an update for an unknown id', () => {
    addItem('Milk', 7)

    updateItem(0, 'Bread', 1)

    expect(items.map((item) => item.description)).toEqual(['Milk'])
  })

  test('sets the expiration to today plus the duration', () => {
    const item = addItem('Milk', 7)

    toggleExpiry(item.id)

    expect(getItem(item.id)?.expiresOn).toBe('2026-09-29')
  })

  test('expires today when the duration is zero', () => {
    const item = addItem('Milk', 0)

    toggleExpiry(item.id)

    expect(getItem(item.id)?.expiresOn).toBe('2026-09-22')
  })

  test('clears the expiration when toggled again', () => {
    const item = addItem('Milk', 7)

    toggleExpiry(item.id)
    toggleExpiry(item.id)

    expect(getItem(item.id)?.expiresOn).toBeNull()
  })

  test('leaves the expiration alone when the duration changes', () => {
    const item = addItem('Milk', 7)
    toggleExpiry(item.id)

    updateItem(item.id, 'Milk', 1)

    expect(getItem(item.id)?.expiresOn).toBe('2026-09-29')
  })

  test('ignores a toggle for an unknown id', () => {
    expect(() => toggleExpiry(0)).not.toThrow()
  })

  test('removes only the requested item', () => {
    const milk = addItem('Milk', 7)
    addItem('Bread', 3)

    removeItem(milk.id)

    expect(items.map((item) => item.description)).toEqual(['Bread'])
  })

  test('ignores a removal for an unknown id', () => {
    addItem('Milk', 7)

    removeItem(0)

    expect(items).toHaveLength(1)
  })

  test('hands back the item it removed', () => {
    const milk = addItem('Milk', 7)

    expect(removeItem(milk.id)).toMatchObject({ id: milk.id, description: 'Milk' })
    expect(removeItem(milk.id)).toBeUndefined()
  })

  test('restores a removed item under its original id', () => {
    const milk = addItem('Milk', 7)
    addItem('Bread', 3)

    restoreItem(removeItem(milk.id)!)

    expect(getItem(milk.id)).toMatchObject({ description: 'Milk', durationDays: 7 })
    expect(items).toHaveLength(2)
  })

  test('ignores a restore of an item that is still in the list', () => {
    const milk = addItem('Milk', 7)
    const removed = removeItem(milk.id)!

    restoreItem(removed)
    restoreItem(removed)

    expect(items).toHaveLength(1)
  })

  describe('display order', () => {
    const order = () => sortedItems.value.map((item) => item.description)

    test('orders by expiration, then description, with undated items last', () => {
      const bread = addItem('Bread', 3)
      const yoghurt = addItem('Yoghurt', 3)
      const milk = addItem('Milk', 1)
      ;[bread, yoghurt, milk].forEach((item) => toggleExpiry(item.id))
      addItem('Rice', 30)
      addItem('Flour', 30)

      expect(order()).toEqual(['Milk', 'Bread', 'Yoghurt', 'Flour', 'Rice'])
    })

    test('re-sorts when an item is added', () => {
      addItem('Milk', 7)
      addItem('Bread', 3)

      expect(order()).toEqual(['Bread', 'Milk'])
    })

    test('leaves an item in place when its expiration is set', () => {
      addItem('Bread', 3)
      const milk = addItem('Milk', 7)

      toggleExpiry(milk.id)

      expect(order()).toEqual(['Bread', 'Milk'])
      expect(sortedItems.value[1].expiresOn).toBe('2026-09-29')
    })

    test('leaves an item in place when its expiration is cleared', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)
      addItem('Bread', 3)

      toggleExpiry(milk.id)

      expect(order()).toEqual(['Milk', 'Bread'])
    })

    test('re-sorts when an item is edited', () => {
      addItem('Bread', 3)
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)

      updateItem(milk.id, 'Milk', 7)

      expect(order()).toEqual(['Milk', 'Bread'])
    })

    test('re-sorts by the new description when an item is renamed', () => {
      const bread = addItem('Bread', 3)
      addItem('Milk', 7)

      updateItem(bread.id, 'Water', 3)

      expect(order()).toEqual(['Milk', 'Water'])
    })

    test('keeps the order of the others when an item is removed', () => {
      addItem('Bread', 3)
      const milk = addItem('Milk', 7)
      const rice = addItem('Rice', 30)
      toggleExpiry(milk.id)

      removeItem(rice.id)

      expect(order()).toEqual(['Bread', 'Milk'])
    })

    test('puts a restored item back where it was, without moving the others', () => {
      addItem('Bread', 3)
      const milk = addItem('Milk', 7)
      addItem('Rice', 30)
      toggleExpiry(milk.id)

      restoreItem(removeItem(milk.id)!)

      expect(order()).toEqual(['Bread', 'Milk', 'Rice'])
    })

    test('sorts a restored item into place when the list was re-sorted meanwhile', () => {
      const milk = addItem('Milk', 7)
      const removed = removeItem(milk.id)!
      addItem('Rice', 30)
      addItem('Bread', 3)

      restoreItem(removed)

      expect(order()).toEqual(['Bread', 'Milk', 'Rice'])
    })
  })

  describe('reminders', () => {
    test('schedules one when the expiration is set', () => {
      const milk = addItem('Milk', 7)

      toggleExpiry(milk.id)

      expect(scheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: milk.id, description: 'Milk', expiresOn: '2026-09-29' })
      )
    })

    test('cancels it when the expiration is cleared', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)
      vi.clearAllMocks()

      toggleExpiry(milk.id)

      expect(cancelled).toHaveBeenCalledWith(expect.objectContaining({ id: milk.id }))
      expect(scheduled).not.toHaveBeenCalled()
    })

    test('cancels it when the item is removed', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)

      removeItem(milk.id)

      expect(cancelled).toHaveBeenCalledWith(expect.objectContaining({ id: milk.id }))
    })

    test('does not cancel anything when an undated item is removed', () => {
      const milk = addItem('Milk', 7)

      removeItem(milk.id)

      expect(cancelled).not.toHaveBeenCalled()
    })

    test('schedules it again when a dated item is restored', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)
      const removed = removeItem(milk.id)!
      vi.clearAllMocks()

      restoreItem(removed)

      expect(scheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: milk.id, expiresOn: '2026-09-29' })
      )
    })

    test('schedules nothing when an undated item is restored', () => {
      const milk = addItem('Milk', 7)
      const removed = removeItem(milk.id)!

      restoreItem(removed)

      expect(scheduled).not.toHaveBeenCalled()
    })

    test('reschedules with the new text when a dated item is renamed', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)
      vi.clearAllMocks()

      updateItem(milk.id, 'Semi-skimmed milk', 7)

      expect(scheduled).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Semi-skimmed milk', expiresOn: '2026-09-29' })
      )
    })

    test('keeps the reminder on the original date when the duration changes', () => {
      const milk = addItem('Milk', 7)
      toggleExpiry(milk.id)
      vi.clearAllMocks()

      updateItem(milk.id, 'Milk', 1)

      expect(scheduled).toHaveBeenCalledWith(
        expect.objectContaining({ expiresOn: '2026-09-29' })
      )
    })

    test('hands the whole list over when the reminder time changes', () => {
      addItem('Milk', 7)
      addItem('Bread', 3)

      rescheduleReminders()

      expect(rescheduled).toHaveBeenCalledWith([
        expect.objectContaining({ description: 'Milk' }),
        expect.objectContaining({ description: 'Bread' })
      ])
    })

    test('touches no reminder when an undated item is renamed', () => {
      const milk = addItem('Milk', 7)

      updateItem(milk.id, 'Semi-skimmed milk', 3)

      expect(scheduled).not.toHaveBeenCalled()
      expect(cancelled).not.toHaveBeenCalled()
    })
  })
})
