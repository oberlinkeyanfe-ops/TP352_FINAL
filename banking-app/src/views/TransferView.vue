<template>
  <div class="container">
    <h1>Faire un virement</h1>

    <div class="transfer-wrapper">
      <div class="card transfer-card">
        <TransferForm @transfer-success="onTransferSuccess" />
      </div>

      <div class="card balance-card-side">
        <h3>Solde disponible</h3>
        <p class="balance-amount">{{ formatCurrency(totalBalance) }}</p>
        <p class="account-info">Sur {{ accountCount }} compte(s)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBankStore } from '@/stores/bankStore'
import TransferForm from '@/components/TransferForm.vue'
import { formatCurrency } from '@/utils/helpers'

const store = useBankStore()
const totalBalance = computed(() => store.totalBalance)
const accountCount = computed(() => store.accountCount)

const onTransferSuccess = () => {
  store.setNotification('Virement effectué avec succès !', 'success')
}
</script>

<style scoped>
.transfer-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .transfer-wrapper {
    grid-template-columns: 1fr;
  }
}

.balance-card-side {
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  height: fit-content;
}

.balance-card-side h3 {
  color: rgba(255,255,255,0.9);
}

.balance-amount {
  font-size: 36px;
  font-weight: bold;
  margin: 10px 0;
}

.account-info {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
}
</style>
