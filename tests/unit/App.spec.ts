import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import App from '@/App.vue'

/* A factory, not an automock: the plugin is a proxy with no real methods to mock. */
vi.mock('@capacitor/app', () => ({ App: { exitApp: vi.fn(() => Promise.resolve()) } }))

const exited = vi.mocked(CapacitorApp.exitApp)

const Page = defineComponent({ render: () => h('div') })

/* Real routing would drag in every page and its store; only the history depth matters here. */
const mountApp = async () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: Page }]
  })
  await router.push('/home')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [IonicVue, router] } })
  return { router, wrapper }
}

type BackHandler = (processNextHandler: () => void) => unknown

/* Stands in for Ionic's own dispatcher, which only starts on a real device: it collects the
   registered handlers and runs App.vue's, the priority -1 one. The last such one, because
   useBackButton does not unregister on unmount, so earlier tests' apps are still listening. */
const pressBack = () => {
  const handlers: { priority: number; handler: BackHandler }[] = []
  document.dispatchEvent(
    new CustomEvent('ionBackButton', {
      detail: {
        register: (priority: number, handler: BackHandler) => handlers.push({ priority, handler })
      }
    })
  )
  handlers.findLast(({ priority }) => priority === -1)?.handler(() => undefined)
}

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('closes the app when Back is pressed on the first page', async () => {
    const { wrapper } = await mountApp()

    pressBack()

    expect(exited).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  test('stays open when Back is pressed on a page that can go back', async () => {
    const { router, wrapper } = await mountApp()
    await router.push('/settings')
    await flushPromises()

    pressBack()

    expect(exited).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
