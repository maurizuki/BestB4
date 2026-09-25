import { flushPromises, mount } from '@vue/test-utils'
import { IonButton, IonicVue, IonTitle } from '@ionic/vue'
import { App } from '@capacitor/app'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import AboutModal from '@/components/AboutModal.vue'

/* A factory, not an automock: the plugin is a proxy with no real methods to mock. */
vi.mock('@capacitor/app', () => ({ App: { getInfo: vi.fn() } }))

const getInfo = vi.mocked(App.getInfo)

const mountAboutModal = async () => {
  const wrapper = mount(AboutModal, { global: { plugins: [IonicVue] } })
  await flushPromises()
  return wrapper
}

describe('AboutModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getInfo.mockResolvedValue({ name: 'BestB4', id: 'org.bestb4.app', build: '3', version: '0.3' })
  })

  test('has no title', async () => {
    const wrapper = await mountAboutModal()

    expect(wrapper.findComponent(IonTitle).exists()).toBe(false)
  })

  test('shows the app name and the copyright notice', async () => {
    const wrapper = await mountAboutModal()

    expect(wrapper.find('h1').text()).toBe('BestB4')
    expect(wrapper.text()).toContain('© 2026+ Maurizio Basaglia')
  })

  test('links to the official GPL v3 page, opened outside the app', async () => {
    const wrapper = await mountAboutModal()

    const link = wrapper.find('a')
    expect(link.text()).toBe('GNU General Public License v3.0')
    expect(link.attributes('href')).toBe('https://www.gnu.org/licenses/gpl-3.0.html')
    expect(link.attributes('target')).toBe('_blank')
  })

  test('shows the installed version', async () => {
    const wrapper = await mountAboutModal()

    expect(wrapper.find('.version').text()).toBe('Version 0.3')
  })

  /* As on the web, where the plugin has no implementation. */
  test('leaves the version out when it cannot be read', async () => {
    getInfo.mockRejectedValue(new Error('Not implemented on web.'))

    const wrapper = await mountAboutModal()

    expect(wrapper.find('.version').exists()).toBe(false)
  })

  test('asks to be closed when Close is tapped', async () => {
    const wrapper = await mountAboutModal()

    await wrapper.findComponent(IonButton).trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
