<template>
  <div class="admin-stats">
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-info">
          <p class="stat-label">{{ stat.label }}</p>
          <p class="stat-value">{{ stat.value }}</p>
          <span class="stat-change" :class="stat.change > 0 ? 'positive' : 'negative'">
            {{ stat.change > 0 ? '↑' : '↓' }} {{ Math.abs(stat.change) }}%
          </span>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <h3>Activité des 7 derniers jours</h3>
      <div class="chart-bars">
        <div v-for="(day, index) in weeklyData" :key="index" class="bar-container">
          <div
            class="bar"
            :style="{ height: `${(day.value / maxValue) * 100}%` }"
          ></div>
          <span class="bar-label">{{ day.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/helpers'

const props = defineProps({
  stats: Object
})

const stats = computed(() => [
  {
    icon: 'Utilisateurs',
    label: 'Utilisateurs',
    value: props.stats?.totalUsers || 0,
    change: 12
  },
  {
    icon: 'Solde',
    label: 'Solde Total',
    value: formatCurrency(props.stats?.totalBalance || 0),
    change: 8
  },
  {
    icon: 'Transactions',
    label: 'Transactions',
    value: props.stats?.totalTransactions || 0,
    change: 15
  },
  {
    icon: 'Alertes',
    label: 'Anomalies',
    value: props.stats?.flaggedTransactions || 0,
    change: -5
  },
  {
    icon: 'Verrouillés',
    label: 'Comptes verrouillés',
    value: props.stats?.lockedUsers || 0,
    change: -2
  },
  {
    icon: 'Croissance',
    label: 'Croissance mensuelle',
    value: `${props.stats?.monthlyGrowth || 0}%`,
    change: props.stats?.monthlyGrowth || 0
  }
])

const weeklyData = [
  { label: 'Lun', value: 45 },
  { label: 'Mar', value: 52 },
  { label: 'Mer', value: 38 },
  { label: 'Jeu', value: 65 },
  { label: 'Ven', value: 78 },
  { label: 'Sam', value: 30 },
  { label: 'Dim', value: 20 }
]

const maxValue = Math.max(...weeklyData.map(d => d.value))
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0,0,0,0.12);
}

.stat-icon {
  font-size: 35px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  margin: 0;
  font-size: 13px;
  color: #7f8c8d;
}

.stat-value {
  margin: 5px 0;
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-change {
  font-size: 12px;
  font-weight: bold;
}

.stat-change.positive {
  color: #2ecc71;
}

.stat-change.negative {
  color: #e74c3c;
}

.chart-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.chart-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 180px;
  padding: 20px 0;
}

.bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar {
  width: 30px;
  background: linear-gradient(to top, #3498db, #2980b9);
  border-radius: 5px 5px 0 0;
  transition: height 0.3s;
  min-height: 10px;
}

.bar-label {
  margin-top: 10px;
  font-size: 12px;
  color: #7f8c8d;
}
</style>
