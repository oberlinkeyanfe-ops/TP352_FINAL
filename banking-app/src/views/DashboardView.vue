<template>
  <div class="container dashboard">
    <h1>Tableau de bord</h1>

    <div class="dashboard-grid">
      <div class="card balance-card">
        <h3>Solde total</h3>
        <p class="balance-amount">{{ formatCurrency(totalBalance) }}</p>
        <p class="account-count">{{ accountCount }} compte(s)</p>
      </div>

      <div class="card accounts-summary">
        <h3>Vos comptes</h3>
        <div v-for="account in accounts" :key="account.id" class="account-item">
          <span class="account-name">{{ account.name }}</span>
          <span class="account-balance">{{ formatCurrency(account.balance) }}</span>
        </div>
        <div v-if="accounts.length === 0" class="no-data">
          Aucun compte disponible
        </div>
      </div>
    </div>

    <div class="card transactions-section">
      <h3>Dernières transactions</h3>
      <TransactionList :transactions="recentTransactions" />
    </div>

    <div class="quick-actions">
      <router-link to="/transfer" class="btn btn-success">
        Faire un virement
      </router-link>
      <router-link to="/accounts" class="btn btn-primary">
        Voir les comptes
      </router-link>
      <router-link v-if="isAdmin" to="/admin" class="btn btn-danger">
        Admin Panel
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBankStore } from '@/stores/bankStore'
import TransactionList from '@/components/TransactionList.vue'
import { formatCurrency } from '@/utils/helpers'

const store = useBankStore()

const totalBalance = computed(() => store.totalBalance)
const accountCount = computed(() => store.accountCount)
const accounts = computed(() => store.accounts)
const recentTransactions = computed(() => store.recentTransactions)
const isAdmin = computed(() => store.isAdmin)

onMounted(async () => {
  if (store.isAuthenticated) {
    await store.fetchAccounts()
    await store.fetchTransactions()
  }
})
</script>

<style scoped>
.dashboard h1 {
  margin-bottom: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.balance-card {
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.balance-card h3 {
  color: rgba(255,255,255,0.9);
}

.balance-amount {
  font-size: 42px;
  font-weight: bold;
  margin: 10px 0;
}

.account-count {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
}

.accounts-summary .account-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.accounts-summary .account-item:last-child {
  border-bottom: none;
}

.account-name {
  font-weight: 500;
}

.account-balance {
  font-weight: 600;
  color: #2c3e50;
}

.transactions-section {
  margin-bottom: 20px;
}

.quick-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.quick-actions .btn {
  flex: 1;
  text-align: center;
  min-width: 150px;
  text-decoration: none;
}

.no-data {
  color: #7f8c8d;
  text-align: center;
  padding: 20px;
}
</style>
