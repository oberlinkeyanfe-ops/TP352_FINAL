<template>
  <div class="transaction-list">
    <div v-if="transactions.length === 0" class="no-transactions">
      Aucune transaction
    </div>

    <div
      v-for="transaction in transactions"
      :key="transaction.id"
      class="transaction-item"
    >
      <div class="transaction-icon">
        {{ getTransactionIcon(transaction.type) }}
      </div>

      <div class="transaction-info">
        <div class="transaction-description">
          {{ transaction.description || transaction.type }}
          <span class="transaction-status" :class="transaction.status">
             {{ transaction.status === 'completed' ? 'Terminé' :
               transaction.status === 'pending' ? 'En attente' : 'Erreur' }}
          </span>
        </div>
        <div class="transaction-date">
          {{ formatDate(transaction.createdAt) }}
        </div>
      </div>

      <div class="transaction-amount" :class="transaction.amount > 0 ? 'positive' : 'negative'">
        {{ transaction.amount > 0 ? '+' : '' }}{{ formatCurrency(transaction.amount) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatCurrency, formatDate, getTransactionIcon } from '@/utils/helpers'

defineProps({
  transactions: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.transaction-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-icon {
  font-size: 28px;
}

.transaction-info {
  flex: 1;
}

.transaction-description {
  font-weight: 500;
  color: #2c3e50;
}

.transaction-status {
  margin-left: 8px;
  font-size: 14px;
}

.transaction-date {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 2px;
}

.transaction-amount {
  font-weight: 600;
  font-size: 18px;
}

.transaction-amount.positive {
  color: #2ecc71;
}

.transaction-amount.negative {
  color: #e74c3c;
}

.no-transactions {
  text-align: center;
  padding: 30px;
  color: #7f8c8d;
}
</style>
