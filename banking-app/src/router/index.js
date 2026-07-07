import { createRouter, createWebHistory } from 'vue-router'
import { useBankStore } from '@/stores/bankStore'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'UserDashboard',
    component: () => import('@/views/UserDashboard.vue'),
    meta: { auth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/AdminDashboard.vue'),
    meta: { auth: true, admin: true }
  },
  // Redirection par défaut vers login
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const store = useBankStore()
  const token = localStorage.getItem('token')

  // Restaurer la session si token existe
  if (token && !store.user) {
    try {
      await store.fetchProfile()
    } catch (error) {
      // Si le token est invalide, on le supprime
      localStorage.removeItem('token')
    }
  }

  // Routes protégées (authentification requise)
  if (to.meta.auth && !store.user) {
    next('/login')
    return
  }

  // Routes admin (rôle ADMIN requis)
  if (to.meta.admin && store.user?.role !== 'ADMIN') {
    next('/')
    return
  }

  // Routes guest (login) - rediriger vers dashboard si déjà connecté
  if (to.meta.guest && store.user) {
    if (store.user.role === 'ADMIN') {
      next('/admin')
    } else {
      next('/')
    }
    return
  }

  next()
})

export default router