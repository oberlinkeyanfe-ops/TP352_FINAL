<template>
  <div class="admin-anomalies">
    <div class="anomalies-header">
      <h3>Anomalies détectées</h3>
      <div class="filter-buttons">
        <button
          v-for="status in ['all', 'flagged', 'resolved']"
          :key="status"
          @click="filterStatus = status"
          class="filter-btn"
          :class="{ active: filterStatus === status }"
        >
          {{ status === 'all' ? 'Toutes' : status === 'flagged' ? 'En attente' : 'Résolues' }}
        </button>
      </div>
    </div>

    <div v-if="filteredAnomalies.length === 0" class="no-anomalies">
      Aucune anomalie à afficher
    </div>

    <div v-for="anomaly in filteredAnomalies" :key="anomaly.id" class="anomaly-card">
      <div class="anomaly-header">
        <div class="anomaly-user">
          <strong>{{ anomaly.userId.firstName }} {{ anomaly.userId.lastName }}</strong>
          <span class="email">{{ anomaly.userId.email }}</span>
        </div>
        <span class="amount" :class="anomaly.amount > 0 ? 'positive' : 'negative'">
          {{ formatCurrency(anomaly.amount) }}
        </span>
      </div>

      <div class="anomaly-body">
        <p class="description">{{ anomaly.description }}</p>
        <div class="anomaly-details">
          <span class="badge" :class="anomaly.status">
            {{ anomaly.status === 'flagged' ? 'Anomalie' : 'Résolue' }}
          </span>
          <span class="date">📅 {{ formatShortDate(anomaly.createdAt) }}</span>
          <span class="type">🏷️ {{ anomaly.type }}</span>
        </div>

        <div v-if="anomaly.anomalies" class="anomaly-reasons">
          <span v-for="(reason, idx) in anomaly.anomalies" :key="idx" class="reason-tag">
            {{ reason }}
          </span>
        </div>
      </div>

      <div v-if="anomaly.status === 'flagged'" class="anomaly-actions">
        <button @click="$emit('resolve', anomaly.id)" class="btn-resolve">
          Résoudre l'anomalie
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatCurrency, formatShortDate } from '@/utils/helpers'

const props = defineProps({
  anomalies: Array
})

defineEmits(['resolve'])

const filterStatus = ref('all')

const filteredAnomalies = computed(() => {
  if (filterStatus.value === 'all') return props.anomalies || []
  return (props.anomalies || []).filter(a => a.status === filterStatus.value)
})
</script>

<style scoped>
.anomalies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.anomalies-header h3 {
  margin: 0;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.filter-btn:hover:not(.active) {
  background: #f0f2f5;
}

.no-anomalies {
  text-align: center;
  padding: 40px;
  color: #2ecc71;
  font-size: 18px;
}

.anomaly-card {
  background: #fff3cd;
  padding: 18px;
  margin: 12px 0;
  border-radius: 10px;
  border-left: 4px solid #ffc107;
  transition: all 0.2s;
}

.anomaly-card:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.anomaly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.anomaly-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.anomaly-user .email {
  font-size: 13px;
  color: #7f8c8d;
}

.amount {
  font-size: 20px;
  font-weight: bold;
}

.amount.positive {
  color: #2ecc71;
}

.amount.negative {
  color: #e74c3c;
}

.anomaly-body {
  flex: 1;
}

.description {
  margin: 0 0 10px 0;
  font-weight: 500;
}

.anomaly-details {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.badge.flagged {
  background: #ffc107;
  color: #856404;
}

.badge.resolved {
  background: #28a745;
  color: white;
}

.date, .type {
  font-size: 13px;
  color: #7f8c8d;
}

.anomaly-reasons {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reason-tag {
  background: rgba(255, 193, 7, 0.3);
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
}

.anomaly-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.btn-resolve {
  background: #28a745;
  color: white;
  padding: 8px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-resolve:hover {
  background: #218838;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .anomaly-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .anomaly-user {
    flex-wrap: wrap;
  }
}
</style>
