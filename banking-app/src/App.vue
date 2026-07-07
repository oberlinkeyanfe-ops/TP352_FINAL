<template>
  <div id="app">
    <NavBar v-if="isAuthenticated" />
    <router-view />
    
    <!-- Notification -->
    <div v-if="notification" class="notification" :class="notification.type">
      {{ notification.message }}
      <button @click="clearNotification" class="close-btn">&times;</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBankStore } from '@/stores/bankStore'
import NavBar from '@/components/NavBar.vue'

const store = useBankStore()
const isAuthenticated = computed(() => store.isAuthenticated)
const notification = computed(() => store.notification)

const clearNotification = () => {
  store.clearNotification()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f0f2f5;
  color: #2c3e50;
}

#app {
  min-height: 100vh;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  font-size: 14px;
}

.btn-primary {
  background: #1a2a6c;
  color: white;
}
.btn-primary:hover {
  background: #2d3561;
}

.btn-success {
  background: #2ecc71;
  color: white;
}
.btn-success:hover {
  background: #27ae60;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}
.btn-danger:hover {
  background: #c0392b;
}

.btn-warning {
  background: #f39c12;
  color: white;
}
.btn-warning:hover {
  background: #d68910;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
}

.card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1a2a6c;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin: 10px 0;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 8px;
  color: white;
  z-index: 9999;
  max-width: 400px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  animation: slideIn 0.3s ease;
}

.notification.success { background: #2ecc71; }
.notification.error { background: #e74c3c; }
.notification.warning { background: #f39c12; }

.notification .close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  margin-left: 15px;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>