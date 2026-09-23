import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Preferences } from '@capacitor/preferences'
import { reportError } from '@/utils/toast'

/* Mocked modules survive vi.resetModules(), so this handle stays valid across restarts. */
vi.mock('@/utils/toast')

const reported = vi.mocked(reportError)

const settle = () => flushPromises()

/* jsdom has no matchMedia. This stand-in lets a test decide the OS scheme and flip it. */
const system = {
  dark: false,
  listeners: [] as (() => void)[],
  switchTo(dark: boolean) {
    this.dark = dark
    this.listeners.forEach((listener) => listener())
  }
}

const matchMedia = (query: string) => ({
  media: query,
  get matches() {
    return system.dark
  },
  addEventListener: (_type: string, listener: () => void) => system.listeners.push(listener)
})

const root = document.documentElement
const isDark = () => root.classList.contains('ion-palette-dark')

/* The theme is module-level state, so only a fresh module is an honest restart. */
const restart = async () => {
  vi.resetModules()
  const store = await import('@/composables/useTheme')
  await store.loadTheme()
  return store.useTheme()
}

describe('useTheme', () => {
  beforeEach(() => {
    system.dark = false
    system.listeners = []
    vi.stubGlobal('matchMedia', matchMedia)
    root.classList.remove('ion-palette-dark')
    root.style.colorScheme = ''
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await settle()
    vi.unstubAllGlobals()
  })

  test('starts on Auto and follows a dark system', async () => {
    system.dark = true

    const { theme } = await restart()

    expect(theme.value).toBe('auto')
    expect(isDark()).toBe(true)
    expect(root.style.colorScheme).toBe('')
  })

  test('stays light on Auto when the system is light', async () => {
    await restart()

    expect(isDark()).toBe(false)
  })

  test('keeps Light even when the system is dark', async () => {
    system.dark = true
    const { setTheme } = await restart()

    setTheme('light')

    expect(isDark()).toBe(false)
    expect(root.style.colorScheme).toBe('light')
  })

  test('goes dark with Dark even when the system is light', async () => {
    const { setTheme } = await restart()

    setTheme('dark')

    expect(isDark()).toBe(true)
    expect(root.style.colorScheme).toBe('dark')
  })

  test('applies a change straight away, with no restart', async () => {
    const { theme, setTheme } = await restart()

    setTheme('dark')
    expect(isDark()).toBe(true)

    setTheme('light')
    expect(theme.value).toBe('light')
    expect(isDark()).toBe(false)
  })

  test('follows the system when it switches while on Auto', async () => {
    await restart()

    system.switchTo(true)
    expect(isDark()).toBe(true)

    system.switchTo(false)
    expect(isDark()).toBe(false)
  })

  test('ignores a system switch while a choice is forced', async () => {
    const { setTheme } = await restart()
    setTheme('light')

    system.switchTo(true)

    expect(isDark()).toBe(false)
  })

  test('restores the saved choice after a restart', async () => {
    const before = await restart()
    before.setTheme('dark')
    await settle()
    root.classList.remove('ion-palette-dark')

    const { theme } = await restart()

    expect(theme.value).toBe('dark')
    expect(isDark()).toBe(true)
  })

  test('falls back to Auto when the saved value is not a theme', async () => {
    await Preferences.set({ key: 'theme', value: 'purple' })

    const { theme } = await restart()

    expect(theme.value).toBe('auto')
    expect(reported).not.toHaveBeenCalled()
  })

  test('applies the choice and tells the user when it cannot be saved', async () => {
    const { setTheme } = await restart()
    /* Preferences is a plugin proxy with no real method to spy on, so the failure is made
       where it would really happen: the storage behind it running out of room. */
    const failure = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw failure
    })

    setTheme('dark')
    await settle()

    expect(isDark()).toBe(true)
    expect(reported).toHaveBeenCalledWith('Your settings could not be saved.', failure)
    setItem.mockRestore()
  })
})
