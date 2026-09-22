import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { addDays, daysUntil, expiryChip, reminderTime, toIsoDate, today } from '@/utils/expiry'

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

  test('puts the reminder at 09:00 on the expiration day', () => {
    expect(reminderTime('2026-09-23')).toEqual(new Date(2026, 8, 23, 9, 0, 0, 0))
  })

  test('has no reminder left once 09:00 today has passed', () => {
    expect(reminderTime('2026-09-22')).toBeNull()
  })

  test('has no reminder left for a date that has gone by', () => {
    expect(reminderTime('2026-09-19')).toBeNull()
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
