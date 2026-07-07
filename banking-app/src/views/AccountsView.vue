<template>
  <div class="container">
    <h1>Mes comptes</h1>

    <div class="accounts-grid">
      <div v-for="account in accounts" :key="account.id" class="card account-card">
        <div class="account-icon">
          {{ account.type === 'checking' ? 'Compte courant' : 'Compte épargne' }}
        </div>
        <div class="account-info">
          <h3>{{ account.name }}</h3>
          <p class="account-type">{{ account.type === 'checking' ? 'Compte courant' : 'Compte épargne' }}</p>
          <p class="account-balance">{{ formatCurrency(account.balance) }}</p>
        </div>
      </div>
    </div>

    <div v-if="accounts.length === 0" class="no-accounts">
      <p>Vous n'avez pas encore de comptes</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBankStore } from '@/stores/bankStore'
import { formatCurrency } from '@/utils/helpers'

const store = useBankStore()
const accounts = computed(() => store.accounts)

onMounted(() => {
  store.fetchAccounts()
})
</script>

<style scoped>
.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  transition: transform 0.2s;
}

.account-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

.account-icon {
  font-size: 40px;
}

.account-info {
  flex: 1;
}

.account-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.account-type {
  margin: 0;
  color: #7f8c8d;
  font-size: 13px;
}

.account-balance {
  margin: 8px 0 0 0;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.no-accounts {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}
</style>
