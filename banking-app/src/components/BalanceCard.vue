<template>
  <div class="balance-card" :class="variant">
    <div class="balance-header">
      <span class="balance-icon">{{ icon }}</span>
      <span class="balance-label">{{ label }}</span>
    </div>
    <p class="balance-amount">{{ formatCurrency(amount) }}</p>
    <p v-if="subtext" class="balance-subtext">{{ subtext }}</p>
  </div>
</template>

<script setup>
import { formatCurrency } from '@/utils/helpers'

defineProps({
  amount: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    default: 'Solde'
  },
  icon: {
    type: String,
    default: 'Solde'
  },
  subtext: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default'
  }
})
</script>

<style scoped>
.balance-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  transition: transform 0.2s;
}

.balance-card:hover {
  transform: translateY(-3px);
}

.balance-card.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.balance-card.success {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: white;
}

.balance-card.danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.balance-icon {
  font-size: 24px;
}

.balance-label {
  font-size: 14px;
  color: inherit;
  opacity: 0.8;
}

.balance-amount {
  font-size: 32px;
  font-weight: bold;
  margin: 5px 0;
}

.balance-subtext {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
}
</style>
