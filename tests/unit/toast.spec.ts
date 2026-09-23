import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { toastController } from '@ionic/vue'
import { reportError } from '@/utils/toast'

/* jsdom has no Element.animate, so a real Ionic toast may never finish presenting; what
   matters here is what gets handed to the controller. */
vi.mock('@ionic/vue', () => ({
  toastController: {
    create: vi.fn(async () => ({ present: vi.fn(async () => undefined) })),
    getTop: vi.fn(async () => undefined)
  }
}))

const create = vi.mocked(toastController.create)
const getTop = vi.mocked(toastController.getTop)

const settle = () => flushPromises()

describe('reportError', () => {
  let logged: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => logged.mockRestore())

  test('shows the message in a danger toast at the bottom', async () => {
    reportError('Your changes could not be saved.', new Error('quota'))
    await settle()

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Your changes could not be saved.',
        color: 'danger',
        position: 'bottom'
      })
    )
  })

  test('presents the toast it created', async () => {
    const present = vi.fn(async () => undefined)
    create.mockResolvedValueOnce({ present } as unknown as HTMLIonToastElement)

    reportError('Your changes could not be saved.', new Error('quota'))
    await settle()

    expect(present).toHaveBeenCalledOnce()
  })

  test('dismisses the toast already showing before presenting a new one', async () => {
    const dismiss = vi.fn(async () => true)
    getTop.mockResolvedValueOnce({ dismiss } as unknown as HTMLIonToastElement)

    reportError('Your changes could not be saved.', new Error('quota'))
    await settle()

    expect(dismiss).toHaveBeenCalledOnce()
    expect(dismiss.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0])
  })

  test('logs the error to the console for whoever debugs it', async () => {
    const error = new Error('quota')

    reportError('Your changes could not be saved.', error)
    await settle()

    expect(logged).toHaveBeenCalledWith('Your changes could not be saved.', error)
  })

  test('logs nothing when there is no error behind the message', async () => {
    reportError('Notifications are not allowed, so no reminder will be shown.')
    await settle()

    expect(create).toHaveBeenCalled()
    expect(logged).not.toHaveBeenCalled()
  })

  test('falls back to the console when the toast cannot be shown', async () => {
    create.mockRejectedValueOnce(new Error('no overlay'))

    expect(() => reportError('Your changes could not be saved.')).not.toThrow()
    await settle()

    expect(logged).toHaveBeenCalledWith('The error toast could not be shown.', expect.any(Error))
  })
})
