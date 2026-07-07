<template>
  <nav class="navbar">
    <div class="nav-container">
      <router-link to="/" class="nav-brand">
        Banking App
      </router-link>

      <div class="nav-links">
        <router-link to="/" class="nav-link">
          Dashboard
        </router-link>
        <router-link to="/accounts" class="nav-link">
          Comptes
        </router-link>
        <router-link to="/transfer" class="nav-link">
          Virement
        </router-link>
        <router-link v-if="isAdmin" to="/admin" class="nav-link admin-link">
          Admin
        </router-link>
      </div>

      <div class="nav-user">
        <span class="user-name">{{ user?.firstName }}</span>
        <button @click="logout" class="btn-logout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '@/stores/bankStore'

const router = useRouter()
const store = useBankStore()

const user = computed(() => store.user)
const isAdmin = computed(() => store.isAdmin)

const logout = () => {
  store.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.nav-brand {
  font-size: 20px;
  font-weight: bold;
  text-decoration: none;
  color: #2c3e50;
}

.nav-links {
  display: flex;
  gap: 5px;
  align-items: center;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 5px;
  text-decoration: none;
  color: #7f8c8d;
  transition: all 0.2s;
  font-weight: 500;
}

.nav-link:hover {
  background: #f0f2f5;
  color: #2c3e50;
}

.nav-link.router-link-active {
  background: #3498db;
  color: white;
}

.nav-link.admin-link {
  color: #e74c3c;
}

.nav-link.admin-link.router-link-active {
  background: #e74c3c;
  color: white;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
}

.btn-logout {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  transition: background 0.2s;
}

.btn-logout:hover {
  background: #f0f2f5;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>
