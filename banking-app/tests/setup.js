import { vi } from 'vitest'
import { config } from '@vue/test-utils'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

config.global.stubs = {
}
