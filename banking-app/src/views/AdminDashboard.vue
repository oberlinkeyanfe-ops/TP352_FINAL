<template>
  <div class="admin-dashboard">
    <!-- Sidebar -->
    <div class="admin-sidebar">
      <div class="sidebar-header">
        <h2>🏦 Admin</h2>
        <span class="badge">Admin</span>
      </div>
      
      <nav class="sidebar-nav">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          class="nav-item"
          :class="{ active: currentTab === item.id }"
          @click="currentTab = item.id"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info">
          <span class="avatar">👤</span>
          <div>
            <p class="admin-name">{{ user?.name }}</p>
            <p class="admin-email">{{ user?.email }}</p>
          </div>
        </div>
        <button @click="logout" class="btn btn-danger btn-sm">Déconnexion</button>
      </div>
    </div>

    <!-- Contenu -->
    <div class="admin-main">
      <header class="admin-header">
        <h1>{{ currentTitle }}</h1>
        <div class="header-actions">
          <span class="last-update">🔄 {{ lastUpdate }}</span>
          <button @click="refreshData" class="btn btn-primary btn-sm">Rafraîchir</button>
        </div>
      </header>

      <div class="admin-content">
        <!-- DASHBOARD -->
        <div v-if="currentTab === 'dashboard'">
          <div class="stats-grid">
            <div class="stat-card" v-for="stat in stats" :key="stat.label">
              <div class="stat-icon">{{ stat.icon }}</div>
              <div>
                <p class="stat-label">{{ stat.label }}</p>
                <p class="stat-value">{{ stat.value }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>🚨 Anomalies récentes</h3>
            <div v-if="anomalies.length === 0" class="no-data">
              ✅ Aucune anomalie détectée
            </div>
            <div v-for="a in anomalies.slice(0,5)" :key="a.id" class="anomaly-item">
              <div>
                <strong>{{ a.user?.email }}</strong>
                <span class="anomaly-amount">{{ formatCurrency(a.amount) }}</span>
                <span class="anomaly-desc">{{ a.description }}</span>
              </div>
              <button @click="resolveAnomaly(a.id)" class="btn btn-success btn-sm">
                Résoudre
              </button>
            </div>
          </div>
        </div>

        <!-- UTILISATEURS -->
        <div v-if="currentTab === 'users'">
          <div class="panel-header">
            <h2>👥 Utilisateurs</h2>
            <button class="btn btn-primary" @click="showCreateUser = true">
              + Ajouter
            </button>
          </div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.id">
                  <td>{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ u.phone }}</td>
                  <td><span class="role-badge" :class="u.role">{{ u.role }}</span></td>
                  <td>
                    <span class="status-badge" :class="u.isLocked ? 'locked' : 'active'">
                      {{ u.isLocked ? '🔒 Verrouillé' : '✅ Actif' }}
                    </span>
                  </td>
                  <td>
                    <button @click="toggleUserLock(u.id, u.isLocked)" class="btn btn-sm" :class="u.isLocked ? 'btn-success' : 'btn-warning'">
                      {{ u.isLocked ? 'Déverrouiller' : 'Verrouiller' }}
                    </button>
                    <button @click="deleteUser(u.id)" class="btn btn-danger btn-sm">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- COMPTES ADMIN -->
        <div v-if="currentTab === 'accounts'">
          <div class="panel-header">
            <h2>🏦 Tous les comptes</h2>
            <button class="btn btn-primary" @click="showCreateAccountAdmin = true">
              + Créer compte (Admin)
            </button>
          </div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Type</th>
                  <th>Solde</th>
                  <th>Propriétaire</th>
                  <th>Banque</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="acc in allAccounts" :key="acc.id">
                  <td>{{ acc.account_number }}</td>
                  <td>{{ acc.account_type }}</td>
                  <td>{{ formatCurrency(acc.balance) }}</td>
                  <td>{{ acc.user_name || 'N/A' }}</td>
                  <td>{{ acc.bank_name }}</td>
                  <td>
                    <button @click="editAccount(acc)" class="btn btn-primary btn-sm">✏️</button>
                    <button @click="deleteAccount(acc.id)" class="btn btn-danger btn-sm">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TRANSACTIONS -->
        <div v-if="currentTab === 'transactions'">
          <div class="panel-header">
            <h2>📊 Toutes les transactions</h2>
          </div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Description</th>
                  <th>Compte</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in allTransactions" :key="t.id">
                  <td>{{ t.type }}</td>
                  <td :class="t.amount > 0 ? 'positive' : 'negative'">
                    {{ formatCurrency(t.amount) }}
                  </td>
                  <td>{{ t.description }}</td>
                  <td>{{ t.account_number }}</td>
                  <td>{{ formatDate(t.created_at) }}</td>
                  <td><span class="status-badge" :class="t.status">{{ t.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ANOMALIES -->
        <div v-if="currentTab === 'anomalies'">
          <div class="panel-header">
            <h2>🚨 Anomalies</h2>
          </div>
          
          <div v-if="anomalies.length === 0" class="no-data">
            ✅ Aucune anomalie à traiter
          </div>
          
          <div v-for="a in anomalies" :key="a.id" class="anomaly-card">
            <div class="anomaly-header">
              <div>
                <strong>{{ a.user?.email }}</strong>
                <span class="anomaly-amount">{{ formatCurrency(a.amount) }}</span>
              </div>
              <span class="anomaly-date">{{ formatDate(a.created_at) }}</span>
            </div>
            <p class="anomaly-desc">{{ a.description }}</p>
            <div class="anomaly-reasons">
              <span v-for="(r, idx) in a.anomalies" :key="idx" class="reason-tag">
                ⚠️ {{ r }}
              </span>
            </div>
            <div class="anomaly-actions">
              <button @click="resolveAnomaly(a.id)" class="btn btn-success">
                ✅ Résoudre
              </button>
              <button @click="lockUser(a.userId)" class="btn btn-warning">
                🔒 Verrouiller utilisateur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal création utilisateur (Admin) -->
    <div v-if="showCreateUser" class="modal-overlay" @click.self="showCreateUser = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Ajouter un utilisateur</h2>
          <button @click="showCreateUser = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom</label>
            <input v-model="newUser.name" placeholder="Jean Dupont" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="newUser.email" placeholder="jean@email.com" />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input v-model="newUser.phone" placeholder="0612345678" />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input v-model="newUser.password" type="password" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label>Rôle</label>
            <select v-model="newUser.role">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <button class="btn btn-success" @click="createUserAdmin" :disabled="loading">
            {{ loading ? '⏳ Création...' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal création compte (Admin) -->
    <div v-if="showCreateAccountAdmin" class="modal-overlay" @click.self="showCreateAccountAdmin = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Créer un compte (Admin)</h2>
          <button @click="showCreateAccountAdmin = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Utilisateur</label>
            <select v-model="newAccountAdmin.userId">
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.name }} - {{ u.email }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Type de compte</label>
            <select v-model="newAccountAdmin.accountType">
              <option value="CHECKING">Compte courant</option>
              <option value="SAVINGS">Compte épargne</option>
            </select>
          </div>
          <div class="form-group">
            <label>Banque</label>
            <select v-model="newAccountAdmin.bankId">
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Solde initial (FCFA)</label>
            <input v-model="newAccountAdmin.balance" type="number" min="0" placeholder="0" />
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <button class="btn btn-success" @click="createAccountAdmin" :disabled="loading">
            {{ loading ? '⏳ Création...' : 'Créer le compte' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal édition compte -->
    <div v-if="showEditAccount" class="modal-overlay" @click.self="showEditAccount = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Modifier le compte</h2>
          <button @click="showEditAccount = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nouveau solde (FCFA)</label>
            <input v-model="editAccountData.balance" type="number" min="0" />
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <button class="btn btn-success" @click="updateAccountAdmin" :disabled="loading">
            {{ loading ? '⏳ Mise à jour...' : 'Mettre à jour' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '@/stores/bankStore'
import { formatCurrency, formatDate } from '@/utils/helpers'

const router = useRouter()
const store = useBankStore()
const user = computed(() => store.user)

const currentTab = ref('dashboard')
const loading = ref(false)
const error = ref('')
const lastUpdate = ref(new Date().toLocaleTimeString())
const banks = ref([])

// Données admin
const users = ref([])
const allAccounts = ref([])
const allTransactions = ref([])
const anomalies = ref([
  {
    id: 1,
    userId: 1,
    user: { email: 'john@test.com' },
    amount: 15000,
    description: 'Virement suspect vers compte externe',
    anomalies: ['Montant anormalement élevé', 'Nouveau bénéficiaire'],
    created_at: new Date().toISOString()
  }
])

const stats = ref([
  { icon: '👥', label: 'Utilisateurs', value: 0 },
  { icon: '🏦', label: 'Comptes', value: 0 },
  { icon: '💰', label: 'Transactions', value: 0 },
  { icon: '🚨', label: 'Anomalies', value: 0 },
  { icon: '🔒', label: 'Verrouillés', value: 0 }
])

const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
  { id: 'users', icon: '👥', label: 'Utilisateurs' },
  { id: 'accounts', icon: '🏦', label: 'Comptes' },
  { id: 'transactions', icon: '💰', label: 'Transactions' },
  { id: 'anomalies', icon: '🚨', label: 'Anomalies', badge: '2' }
]

const currentTitle = computed(() => {
  const titles = {
    dashboard: '📊 Tableau de bord',
    users: '👥 Gestion des utilisateurs',
    accounts: '🏦 Gestion des comptes',
    transactions: '💰 Toutes les transactions',
    anomalies: '🚨 Anomalies'
  }
  return titles[currentTab.value] || 'Admin'
})

// Modals
const showCreateUser = ref(false)
const showCreateAccountAdmin = ref(false)
const showEditAccount = ref(false)

const newUser = ref({ name: '', email: '', phone: '', password: '', role: 'USER' })
const newAccountAdmin = ref({ userId: '', accountType: 'CHECKING', bankId: 1, balance: 0 })
const editAccountData = ref({ id: '', balance: 0 })

// Charger les données admin
const loadAdminData = async () => {
  try {
    // Utilisateurs
    const userRes = await fetch('http://localhost:3000/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (userRes.ok) {
      users.value = await userRes.json()
    }

    // Tous les comptes (admin)
    const accRes = await fetch('http://localhost:3000/api/admin/accounts', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (accRes.ok) {
      allAccounts.value = await accRes.json()
    }

    // Transactions
    const txRes = await fetch('http://localhost:3000/api/admin/transactions', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (txRes.ok) {
      allTransactions.value = await txRes.json()
    }

    // Stats
    stats.value = [
      { icon: '👥', label: 'Utilisateurs', value: users.value.length },
      { icon: '🏦', label: 'Comptes', value: allAccounts.value.length },
      { icon: '💰', label: 'Transactions', value: allTransactions.value.length },
      { icon: '🚨', label: 'Anomalies', value: anomalies.value.length },
      { icon: '🔒', label: 'Verrouillés', value: users.value.filter(u => u.isLocked).length }
    ]

    lastUpdate.value = new Date().toLocaleTimeString()
  } catch (err) {
    console.error('Erreur chargement admin:', err)
  }
}

// Charger les banques
const loadBanks = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/banks')
    banks.value = await res.json()
  } catch (err) {
    console.error('Erreur banques:', err)
  }
}

// Rafraîchir
const refreshData = async () => {
  await loadAdminData()
}

// Verrouiller/Déverrouiller utilisateur
const toggleUserLock = async (id, isLocked) => {
  try {
    const url = isLocked ? `/admin/users/${id}/unlock` : `/admin/users/${id}/lock`
    await fetch(`http://localhost:3000/api${url}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    await loadAdminData()
    store.setNotification(isLocked ? 'Utilisateur déverrouillé' : 'Utilisateur verrouillé', 'success')
  } catch (err) {
    store.setNotification('Erreur', 'error')
  }
}

// Verrouiller utilisateur (depuis anomalies)
const lockUser = async (id) => {
  await toggleUserLock(id, false)
}

// Supprimer utilisateur
const deleteUser = async (id) => {
  if (confirm('Supprimer cet utilisateur ?')) {
    try {
      await fetch(`http://localhost:3000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      await loadAdminData()
      store.setNotification('Utilisateur supprimé', 'warning')
    } catch (err) {
      store.setNotification('Erreur', 'error')
    }
  }
}

// Créer utilisateur (admin)
const createUserAdmin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newUser.value)
    })
    if (!res.ok) throw new Error('Erreur création')
    await loadAdminData()
    showCreateUser.value = false
    newUser.value = { name: '', email: '', phone: '', password: '', role: 'USER' }
    store.setNotification('Utilisateur créé', 'success')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Créer compte (admin)
const createAccountAdmin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('http://localhost:3000/api/admin/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newAccountAdmin.value)
    })
    if (!res.ok) throw new Error('Erreur création')
    await loadAdminData()
    showCreateAccountAdmin.value = false
    newAccountAdmin.value = { userId: '', accountType: 'CHECKING', bankId: 1, balance: 0 }
    store.setNotification('Compte créé', 'success')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Éditer compte
const editAccount = (account) => {
  editAccountData.value = { id: account.id, balance: account.balance }
  showEditAccount.value = true
}

// Mettre à jour compte
const updateAccountAdmin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`http://localhost:3000/api/admin/accounts/${editAccountData.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ balance: parseFloat(editAccountData.value.balance) })
    })
    if (!res.ok) throw new Error('Erreur mise à jour')
    await loadAdminData()
    showEditAccount.value = false
    store.setNotification('Compte mis à jour', 'success')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Supprimer compte
const deleteAccount = async (id) => {
  if (confirm('Supprimer ce compte ?')) {
    try {
      await fetch(`http://localhost:3000/api/admin/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      await loadAdminData()
      store.setNotification('Compte supprimé', 'warning')
    } catch (err) {
      store.setNotification('Erreur', 'error')
    }
  }
}

// Résoudre anomalie
const resolveAnomaly = async (id) => {
  try {
    await fetch(`http://localhost:3000/api/admin/anomalies/${id}/resolve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    anomalies.value = anomalies.value.filter(a => a.id !== id)
    await loadAdminData()
    store.setNotification('Anomalie résolue', 'success')
  } catch (err) {
    store.setNotification('Erreur', 'error')
  }
}

// Déconnexion
const logout = () => {
  store.logout()
  router.push('/login')
}

onMounted(async () => {
  await loadBanks()
  await loadAdminData()
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

.admin-sidebar {
  width: 260px;
  background: #1a2a6c;
  color: white;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
}

.badge {
  background: #e74c3c;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 11px;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 20px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-item.active {
  background: rgba(255,255,255,0.15);
  color: white;
  border-right: 3px solid #3498db;
}

.nav-icon {
  font-size: 20px;
}

.nav-badge {
  background: #e74c3c;
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 11px;
  margin-left: auto;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.avatar {
  font-size: 32px;
}

.admin-name {
  font-weight: 600;
  margin: 0;
}

.admin-email {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}

.admin-main {
  flex: 1;
  margin-left: 260px;
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-header h1 {
  margin: 0;
  color: #1a2a6c;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.last-update {
  font-size: 13px;
  color: #7f8c8d;
}

.admin-content {
  background: white;
  border-radius: 10px;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 32px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
  margin: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1a2a6c;
  margin: 0;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e9ecef;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
}

.role-badge {
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
}

.role-badge.ADMIN {
  background: #c0392b;
  color: white;
}

.role-badge.USER {
  background: #3498db;
  color: white;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.locked {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.PENDING {
  background: #fff3cd;
  color: #856404;
}

.status-badge.COMPLETED {
  background: #d4edda;
  color: #155724;
}

.positive {
  color: #2ecc71;
}

.negative {
  color: #e74c3c;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-header h2 {
  margin: 0;
  color: #1a2a6c;
}

.anomaly-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff3cd;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #ffc107;
}

.anomaly-amount {
  font-weight: bold;
  margin: 0 10px;
}

.anomaly-card {
  background: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  border-left: 4px solid #ffc107;
}

.anomaly-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.anomaly-desc {
  color: #7f8c8d;
}

.anomaly-reasons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0;
}

.reason-tag {
  background: rgba(255,193,7,0.3);
  padding: 3px 12px;
  border-radius: 15px;
  font-size: 12px;
}

.anomaly-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 15px;
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  color: #1a2a6c;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .admin-sidebar {
    display: none;
  }
  .admin-main {
    margin-left: 0;
  }
}
</style>