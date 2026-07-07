import axios from 'axios'

// URL de l'API en production
const API_URL = import.meta.env.VITE_API_URL || 'https://tp352-final.onrender.com/api'

console.log('🔗 API URL:', API_URL)

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        console.log(`📤 ${config.method.toUpperCase()} ${config.url}`, config.data || '')
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => {
        console.log(`📥 ${response.status} ${response.config.url}`)
        return response
    },
    (error) => {
        console.error('❌ API Error:', error.response?.status, error.response?.data || error.message)

        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }

        // Extraire le message d'erreur du backend
        if (error.response?.data?.error) {
            return Promise.reject(error.response.data.error)
        }

        if (error.response?.data?.errors) {
            const messages = error.response.data.errors.map(e => e.msg || e.message).join(', ')
            return Promise.reject(messages)
        }

        return Promise.reject(error.message || 'Une erreur est survenue')
    }
)

export default api