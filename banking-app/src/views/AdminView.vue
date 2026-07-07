<template>
  <div class="admin-layout">
    <AdminSidebar 
      :current-tab="currentTab" 
      @change-tab="currentTab = $event"
    />

    <div class="admin-main">
      <header class="admin-header">
        <h1>{{ pageTitle }}</h1>
        <div class="header-actions">
          <span class="last-update">{{ lastUpdate }}</span>
          <button @click="refreshData" class="btn-refresh">
            Rafraîchir
          </button>
          <button @click="logout" class="btn-logout">
            Déconnexion
          </button>
        </div>
      </header>

      <div class="admin-content">
        <AdminStats 
          v-if="currentTab === 'dashboard'" 
          :stats="adminStats" 
        />

        <AdminUsers 
          v-if="currentTab === 'users'" 
          :users="users"
          @lock-user="lockUser"
          @unlock-user="unlockUser"
        />

        <AdminAnomalies 
          v-if="currentTab === 'anomalies'"
          :anomalies="anomalies"
          @resolve="resolveAnomaly"
        />

        <div v-if="currentTab === 'settings'" class="settings-panel">
          <h2>Paramètres Administrateur</h2>
          
          <div class="settings-section">
            <h3>Notifications</h3>
            <label>
              <input type="checkbox" v-model="settings.emailAlerts">
              Alertes par email
            </label>
            <label>
              <input type="checkbox" v-model="settings.smsAlerts">
              Alertes par SMS
            </label>
          </div>

          <div class="settings-section danger-zone">
            <h3>Zone Dangereuse</h3>
            <button @click="clearAllData" class="btn btn-danger">
              Supprimer toutes les données (test)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '@/stores/bankStore'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminStats from '@/components/admin/AdminStats.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminAnomalies from '@/components/admin/AdminAnomalies.vue'

const router = useRouter()
const store = useBankStore()
const currentTab = ref('dashboard')

// Données admin
const adminStats = ref({
  totalUsers: 1250,
  activeUsers: 1180,
  totalAccounts: 2100,
  totalTransactions: 15420,
  totalBalance: 2850000,
  flaggedTransactions: 23,
  lockedUsers: 8,
  monthlyGrowth: 12
})

const users = ref([
  { 
    id: 1, 
    email: 'john@email.com', 
    firstName: 'John', 
    lastName: 'Doe',
    isActive: true, 
    isLocked: false,
    accounts: 2,
    totalBalance: 4500,
    lastLogin: '2026-07-06T14:30:00'
  },
  { 
    id: 2, 
    email: 'jane@email.com', 
    firstName: 'Jane', 
    lastName: 'Smith',
    isActive: true, 
    isLocked: true,
    accounts: 1,
    totalBalance: 1200,
    lastLogin: '2026-07-05T09:15:00'
  },
  { 
    id: 3, 
    email: 'bob@email.com', 
    firstName: 'Bob', 
    lastName: 'Johnson',
    isActive: false, 
    isLocked: false,
    accounts: 0,
    totalBalance: 0,
    lastLogin: '2026-06-28T16:45:00'
  }
])

const anomalies = ref([
  {
    id: 1,
    userId: { email: 'john@email.com', firstName: 'John', lastName: 'Doe' },
    amount: 15000,
    type: 'transfer',
    description: 'Virement suspect vers compte externe',
    status: 'flagged',
    createdAt: '2026-07-06T13:20:00',
    anomalies: ['Montant anormalement élevé', 'Nouveau bénéficiaire']
  },
  {
    id: 2,
    userId: { email: 'alice@email.com', firstName: 'Alice', lastName: 'Brown' },
    amount: 2500,
    type: 'withdrawal',
    description: 'Retrait depuis localisation inhabituelle',
    status: 'flagged',
    createdAt: '2026-07-06T11:45:00',
    anomalies: ['Localisation suspecte', 'Nouvel appareil']
  }
])

const settings = ref({
  emailAlerts: true,
  smsAlerts: false
})

const lastUpdate = ref(new Date().toLocaleTimeString())

const pageTitle = computed(() => {
  const titles = {
    dashboard: 'Tableau de bord Admin',
    users: 'Gestion des utilisateurs',
    anomalies: 'Anomalies détectées',
    settings: 'Paramètres'
  }
  return titles[currentTab.value] || 'Admin'
})

const refreshData = () => {
  lastUpdate.value = new Date().toLocaleTimeString()
  // Simuler un refresh
  adminStats.value.totalTransactions += Math.floor(Math.random() * 10)
}

const lockUser = (userId) => {
  const user = users.value.find(u => u.id === userId)
  if (user) {
    user.isLocked = true
    store.setNotification(`Utilisateur ${user.email} verrouillé`, 'warning')
  }
}

const unlockUser = (userId) => {
  const user = users.value.find(u => u.id === userId)
  if (user) {
    user.isLocked = false
    store.setNotification(`Utilisateur ${user.email} déverrouillé`, 'success')
  }
}

const resolveAnomaly = (anomalyId) => {
  const anomaly = anomalies.value.find(a => a.id === anomalyId)
  if (anomaly) {
    anomaly.status = 'resolved'
    store.setNotification('Anomalie résolue', 'success')
  }
}

const clearAllData = () => {
  if (confirm('Supprimer TOUTES les données ?')) {
    alert('Données supprimées (simulation)')
    store.setNotification('Toutes les données ont été supprimées', 'warning')
  }
}

const logout = () => {
  store.logout()
  router.push('/login')
}

onMounted(() => {
  if (!store.isAdmin) {
    router.push('/')
  }
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

.admin-main {
  flex: 1;
  padding: 20px;
  margin-left: 250px;
}

@media (max-width: 768px) {
  .admin-main {
    margin-left: 0;
  }
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.last-update {
  font-size: 12px;
  color: #7f8c8d;
}

.btn-refresh,
.btn-logout {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.btn-refresh {
  background: #3498db;
  color: white;
}

.btn-refresh:hover {
  background: #2980b9;
}

.btn-logout {
  background: #e74c3c;
  color: white;
}

.btn-logout:hover {
  background: #c0392b;
}

.admin-content {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.settings-panel {
  padding: 20px;
}

.settings-section {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.settings-section label {
  display: block;
  margin: 10px 0;
  cursor: pointer;
}

.settings-section input[type="checkbox"] {
  margin-right: 10px;
}

.danger-zone {
  border: 2px solid #e74c3c;
  background: #fde8e8;
}
</style>