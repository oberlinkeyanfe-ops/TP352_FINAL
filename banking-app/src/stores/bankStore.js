import { defineStore } from 'pinia'
import api from '@/services/api'

export const useBankStore = defineStore('bank', {
  state: () => ({
    user: null,
    accounts: [],
    transactions: [],
    loading: false,
    error: null,
    notification: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    totalBalance: (state) => {
      return state.accounts.reduce((sum, acc) => sum + acc.balance, 0)
    },
    recentTransactions: (state) => {
      return state.transactions.slice(0, 5)
    },
    accountCount: (state) => state.accounts.length
  },

  actions: {
    async register(userData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/register', userData)
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/login', credentials)
        const { user, token } = response.data
        this.user = user
        localStorage.setItem('token', token)
        await this.fetchAccounts()
        await this.fetchTransactions()
        return user
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      try {
        const response = await api.get('/profile')
        this.user = response.data
        return this.user
      } catch (error) {
        this.logout()
        throw this.extractErrorMessage(error)
      }
    },

    async fetchAccounts() {
      try {
        const response = await api.get('/accounts')
        this.accounts = response.data
        return this.accounts
      } catch (error) {
        console.error('Erreur chargement comptes:', error)
        throw this.extractErrorMessage(error)
      }
    },

    async fetchTransactions() {
      try {
        const response = await api.get('/transactions')
        this.transactions = response.data.transactions || response.data
        return this.transactions
      } catch (error) {
        console.error('Erreur chargement transactions:', error)
        throw this.extractErrorMessage(error)
      }
    },

    async createAccount(accountData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/accounts', accountData)
        await this.fetchAccounts()
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async closeAccount(accountId) {
      this.loading = true
      try {
        await api.delete(`/accounts/${accountId}`)
        await this.fetchAccounts()
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async deposit(depositData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/accounts/deposit', depositData)
        await this.fetchAccounts()
        await this.fetchTransactions()
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async withdraw(withdrawData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/transactions/withdraw', withdrawData)
        await this.fetchAccounts()
        await this.fetchTransactions()
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async transfer(transferData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/transactions/transfer', transferData)
        await this.fetchAccounts()
        await this.fetchTransactions()
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async externalTransfer(externalData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/transactions/external', externalData)
        await this.fetchAccounts()
        await this.fetchTransactions()
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async updateProfile(profileData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.put('/profile', profileData)
        this.user = response.data.user
        return response.data
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    async deleteAccount() {
      this.loading = true
      try {
        await api.delete('/profile')
        this.logout()
      } catch (error) {
        this.error = this.extractErrorMessage(error)
        throw this.error
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.user = null
      this.accounts = []
      this.transactions = []
      localStorage.removeItem('token')
    },

    setNotification(message, type = 'success') {
      this.notification = { message, type }
      setTimeout(() => {
        this.notification = null
      }, 5000)
    },

    clearNotification() {
      this.notification = null
    },

    // ==================== EXTRACTION DES MESSAGES D'ERREUR ====================
    extractErrorMessage(error) {
      console.error('Erreur brute:', error)

      // 1. Erreur de validation du backend (express-validator)
      if (error.response?.data?.errors) {
        const messages = error.response.data.errors.map(e => e.msg || e.message).join(', ')
        return messages
      }

      // 2. Erreur personnalisée du backend
      if (error.response?.data?.error) {
        return error.response.data.error
      }

      // 3. Erreur de validation du backend (format différent)
      if (error.response?.data?.message) {
        return error.response.data.message
      }

      // 4. Erreur de connexion
      if (error.message === 'Network Error') {
        return 'Impossible de contacter le serveur. Vérifiez votre connexion.'
      }

      // 5. Erreur générique
      return error.message || 'Une erreur est survenue'
    }
  }
})