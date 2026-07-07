import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBankStore } from '@/stores/bankStore'

describe('Bank Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calcule correctement le solde total', () => {
    const store = useBankStore()
    store.accounts = [
      { id: '1', balance: 1000 },
      { id: '2', balance: 500 },
      { id: '3', balance: 200 }
    ]
    expect(store.totalBalance).toBe(1700)
  })

  it('retourne les 5 dernières transactions', () => {
    const store = useBankStore()
    store.transactions = [
      { id: '1', date: new Date(2026, 0, 1) },
      { id: '2', date: new Date(2026, 0, 2) },
      { id: '3', date: new Date(2026, 0, 3) },
      { id: '4', date: new Date(2026, 0, 4) },
      { id: '5', date: new Date(2026, 0, 5) },
      { id: '6', date: new Date(2026, 0, 6) }
    ]
    expect(store.recentTransactions.length).toBe(5)
  })

  it('gère la déconnexion', () => {
    const store = useBankStore()
    store.user = { id: '1', email: 'test@test.com' }
    store.accounts = [{ id: '1', balance: 1000 }]

    store.logout()

    expect(store.user).toBeNull()
    expect(store.accounts).toEqual([])
    expect(store.transactions).toEqual([])
    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
  })
})
