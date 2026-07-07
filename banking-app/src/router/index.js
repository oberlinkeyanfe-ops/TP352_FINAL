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
        path: '/register',
        name: 'Register',
        component: () => import('@/views/RegisterView.vue'),
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
    // Redirection pour les routes non trouvées
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
            localStorage.removeItem('token')
        }
    }

    // Routes protégées
    if (to.meta.auth && !store.user && !token) {
        next('/login')
        return
    }

    // Routes admin
    if (to.meta.admin && store.user?.role !== 'ADMIN') {
        next('/')
        return
    }

    // Routes guest (login, register)
    if (to.meta.guest && store.user) {
        next('/')
        return
    }

    next()
})

export default router