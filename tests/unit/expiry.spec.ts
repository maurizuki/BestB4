import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { addDays, daysUntil, expiryChip, reminderMoment, toIsoDate, today } from '@/utils/expiry'

describe('expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
  })

  afterEach(() => vi.useRealTimers())

  test('formats a date as a local ISO day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  test('reports the current day', () => {
    expect(today()).toBe('2026-09-22')
  })

  test('adds days across a month boundary', () => {
    expect(addDays('2026-09-22', 10)).toBe('2026-10-02')
    expect(addDays('2026-09-22', 0)).toBe('2026-09-22')
  })

  test('counts the days from today to a date', () => {
    expect(daysUntil('2026-09-27')).toBe(5)
    expect(daysUntil('2026-09-22')).toBe(0)
    expect(daysUntil('2026-09-20')).toBe(-2)
  })

  test('puts the reminder at the given time on the expiration day', () => {
    expect(reminderMoment('2026-09-23', '09:00')).toEqual(new Date(2026, 8, 23, 9, 0, 0, 0))
  })

  test('honours the minutes of the given time', () => {
    expect(reminderMoment('2026-09-23', '07:45')).toEqual(new Date(2026, 8, 23, 7, 45, 0, 0))
  })

  test('has no reminder left once that time has passed today', () => {
    expect(reminderMoment('2026-09-22', '09:00')).toBeNull()
  })

  test('still has a reminder when that time is later today', () => {
    expect(reminderMoment('2026-09-22', '18:15')).toEqual(new Date(2026, 8, 22, 18, 15, 0, 0))
  })

  /* The clock is frozen at 10:30:00.000, so 10:30 is exactly now: nothing left to schedule. */
  test('has no reminder left at the exact minute', () => {
    expect(reminderMoment('2026-09-22', '10:30')).toBeNull()
    expect(reminderMoment('2026-09-22', '10:31')).toEqual(new Date(2026, 8, 22, 10, 31, 0, 0))
  })

  test('has no reminder left for a date that has gone by', () => {
    expect(reminderMoment('2026-09-19', '23:59')).toBeNull()
  })

  test('shows the remaining days in green when the date is further out', () => {
    expect(expiryChip('2026-09-27')).toEqual({ label: '5', color: 'success' })
  })

  test('shows tomorrow as a warning', () => {
    expect(expiryChip('2026-09-23')).toEqual({ label: 'tomorrow', color: 'warning' })
  })

  test('shows today as an alert', () => {
    expect(expiryChip('2026-09-22')).toEqual({ label: 'today', color: 'danger' })
  })

  test('shows the days past the date as an alert', () => {
    expect(expiryChip('2026-09-19')).toEqual({ label: '+3', color: 'danger' })
  })
})
