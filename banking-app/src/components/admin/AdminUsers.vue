defineProps({
<template>
  <div class="admin-users">
    <div class="users-header">
      <h3>Gestion des utilisateurs</h3>
      <div class="search-box">
        <input type="text" v-model="search" placeholder="Rechercher..." />
        <select v-model="filter">
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="locked">Verrouillés</option>
          <option value="inactive">Inactifs</option>
        </select>
      </div>
    </div>

    <table class="users-table">
      <thead>
        <tr>
          <th>Utilisateur</th>
          <th>Email</th>
          <th>Status</th>
          <th>Comptes</th>
          <th>Solde</th>
          <th>Dernière connexion</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in paginatedUsers" :key="user.id">
          <td>
            <strong>{{ user.firstName }} {{ user.lastName }}</strong>
          </td>
          <td>{{ user.email }}</td>
          <td>
            <span class="status-badge" :class="getStatusClass(user)">
              {{ getStatusLabel(user) }}
            </span>
          </td>
          <td>{{ user.accounts }}</td>
          <td>{{ formatCurrency(user.totalBalance) }}</td>
          <td>{{ formatShortDate(user.lastLogin) }}</td>
          <td>
            <button
              v-if="!user.isLocked && user.isActive"
              @click="$emit('lock-user', user.id)"
              class="btn-lock"
            >
              Verrouiller
            </button>
            <button
              v-else-if="user.isLocked"
              @click="$emit('unlock-user', user.id)"
              class="btn-unlock"
            >
              Déverrouiller
            </button>
            <span v-else class="inactive-label">Inactif</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button @click="prevPage" :disabled="currentPage === 1">◀</button>
      <span>Page {{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">▶</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatCurrency, formatShortDate } from '@/utils/helpers'

const props = defineProps({
  users: Array
})

defineEmits(['lock-user', 'unlock-user'])

const search = ref('')
const filter = ref('all')
const currentPage = ref(1)
const itemsPerPage = 5

const getStatusClass = (user) => {
  if (user.isLocked) return 'locked'
  if (!user.isActive) return 'inactive'
  return 'active'
}

const getStatusLabel = (user) => {
  if (user.isLocked) return 'Verrouillé'
  if (!user.isActive) return 'Inactif'
  return 'Actif'
}

const filteredUsers = computed(() => {
  let filtered = props.users || []

  if (search.value) {
    const s = search.value.toLowerCase()
    filtered = filtered.filter(u =>
      u.email.toLowerCase().includes(s) ||
      u.firstName.toLowerCase().includes(s) ||
      u.lastName.toLowerCase().includes(s)
    )
  }

  if (filter.value === 'active') {
    filtered = filtered.filter(u => u.isActive && !u.isLocked)
  } else if (filter.value === 'locked') {
    filtered = filtered.filter(u => u.isLocked)
  } else if (filter.value === 'inactive') {
    filtered = filtered.filter(u => !u.isActive)
  }

  return filtered
})

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / itemsPerPage)
)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredUsers.value.slice(start, end)
})

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<style scoped>
.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.users-header h3 {
  margin: 0;
}

.search-box {
  display: flex;
  gap: 10px;
}

.search-box input,
.search-box select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e9ecef;
}

.users-table td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
}

.users-table tr:hover {
  background: #f8f9fa;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.locked {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.inactive {
  background: #e2e3e5;
  color: #383d41;
}

.btn-lock,
.btn-unlock {
  padding: 5px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-lock {
  background: #dc3545;
  color: white;
}

.btn-lock:hover {
  background: #c0392b;
}

.btn-unlock {
  background: #28a745;
  color: white;
}

.btn-unlock:hover {
  background: #218838;
}

.inactive-label {
  color: #7f8c8d;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: #3498db;
  color: white;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .users-table {
    font-size: 12px;
  }

  .users-table th,
  .users-table td {
    padding: 8px;
  }

  .search-box {
    flex-direction: column;
    width: 100%;
  }
}
</style>
