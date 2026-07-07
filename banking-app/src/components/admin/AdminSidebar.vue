<template>
  <aside class="admin-sidebar">
    <div class="sidebar-header">
      <h2>Admin</h2>
      <span class="admin-badge">Administration</span>
    </div>

    <nav class="sidebar-nav">
      <div
        v-for="item in menuItems"
        :key="item.tab"
        class="nav-item"
        :class="{ active: currentTab === item.tab }"
        @click="$emit('change-tab', item.tab)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
        <span v-if="item.badge" class="badge">{{ item.badge }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="admin-info">
        <div class="avatar">A</div>
        <div class="info">
          <p class="name">{{ user?.firstName }} {{ user?.lastName }}</p>
          <p class="email">{{ user?.email }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useBankStore } from '@/stores/bankStore'

const store = useBankStore()
const user = computed(() => store.user)

defineProps({
  currentTab: String
})

defineEmits(['change-tab'])

const menuItems = [
  { tab: 'dashboard', icon: 'D', label: 'Tableau de bord' },
  { tab: 'users', icon: 'U', label: 'Utilisateurs' },
  { tab: 'anomalies', icon: 'A', label: 'Anomalies', badge: '2' },
  { tab: 'settings', icon: 'P', label: 'Paramètres' }
]
</script>

<style scoped>
.admin-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  background: #2c3e50;
  color: white;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

@media (max-width: 768px) {
  .admin-sidebar {
    display: none;
  }
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
  font-size: 20px;
}

.admin-badge {
  background: #e74c3c;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: bold;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
}

.nav-item.active {
  background: rgba(255,255,255,0.15);
  border-right: 3px solid #3498db;
}

.nav-item .icon {
  margin-right: 12px;
  font-size: 18px;
}

.nav-item .label {
  flex: 1;
}

.nav-item .badge {
  background: #e74c3c;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-info .avatar {
  font-size: 30px;
}

.admin-info .info {
  flex: 1;
}

.admin-info .name {
  margin: 0;
  font-weight: bold;
  font-size: 14px;
}

.admin-info .email {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
</style>
