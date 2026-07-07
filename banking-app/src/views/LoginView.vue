<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-logo">
        <span class="bank-icon">🏦</span>
        <h1>Banque UY1</h1>
        <p>{{ isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte bancaire' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="!isLogin" class="form-group">
          <label>Nom complet *</label>
          <input 
            v-model="form.name" 
            type="text" 
            placeholder="Jean Dupont"
            required
          />
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input 
            v-model="form.email" 
            type="email" 
            :placeholder="isLogin ? 'admin@banque.com' : 'jean@email.com'"
            required
          />
        </div>

        <div v-if="!isLogin" class="form-group">
          <label>Téléphone *</label>
          <input 
            v-model="form.phone" 
            type="tel" 
            placeholder="0612345678"
            required
          />
          <small class="hint">Format: 06XXXXXXXX ou 07XXXXXXXX (10 chiffres)</small>
        </div>

        <div class="form-group">
          <label>Mot de passe *</label>
          <div class="password-wrapper">
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••"
              required
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <small v-if="!isLogin" class="hint">Minimum 6 caractères</small>
        </div>

        <div v-if="!isLogin" class="form-group">
          <label>Confirmer le mot de passe *</label>
          <input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="••••••••"
            required
          />
        </div>

        <!-- Affichage des erreurs détaillées -->
        <div v-if="error" class="error-message">
          <strong>❌ Erreur :</strong> {{ error }}
        </div>

        <div v-if="validationErrors.length > 0" class="error-message">
          <strong>❌ Veuillez corriger :</strong>
          <ul>
            <li v-for="(err, index) in validationErrors" :key="index">{{ err }}</li>
          </ul>
        </div>

        <div v-if="successMessage" class="success-message">
          ✅ {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '⏳ Chargement...' : (isLogin ? '🔑 Se connecter' : '🚀 S\'inscrire') }}
        </button>

        <p class="switch-link">
          <span v-if="isLogin">
            Pas encore de compte ? 
            <a href="#" @click.prevent="toggleMode">S'inscrire</a>
          </span>
          <span v-else>
            Déjà un compte ? 
            <a href="#" @click.prevent="toggleMode">Se connecter</a>
          </span>
        </p>

        <div class="demo-hint" v-if="isLogin">
          <p>👤 <strong>Admin:</strong> admin@banque.com / Admin123!</p>
          <p>👤 <strong>User:</strong> Créez votre compte</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '@/stores/bankStore'

const router = useRouter()
const store = useBankStore()

const isLogin = ref(true)

const form = ref({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const validationErrors = ref([])
const successMessage = ref('')
const showPassword = ref(false)

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  validationErrors.value = []
  successMessage.value = ''
  form.value = {
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  }
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  validationErrors.value = []
  successMessage.value = ''

  try {
    if (isLogin.value) {
      // ===== LOGIN =====
      if (!form.value.email || !form.value.password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      await store.login({
        email: form.value.email.trim(),
        password: form.value.password
      })
      
      if (store.user?.role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/')
      }
      
    } else {
      // ===== REGISTER =====
      const errors = []
      
      if (!form.value.name || form.value.name.trim().length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères')
      }
      
      if (!form.value.email || !form.value.email.includes('@')) {
        errors.push('Email invalide')
      }
      
      // Validation téléphone
      const phoneRegex = /^(06|07)[0-9]{8}$/
      if (!form.value.phone || !phoneRegex.test(form.value.phone.trim())) {
        errors.push('Téléphone invalide. Utilisez 06XXXXXXXX ou 07XXXXXXXX (10 chiffres)')
      }
      
      if (!form.value.password || form.value.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères')
      }
      
      if (form.value.password !== form.value.confirmPassword) {
        errors.push('Les mots de passe ne correspondent pas')
      }
      
      if (errors.length > 0) {
        validationErrors.value = errors
        loading.value = false
        return
      }

      // Envoi de la requête
      const userData = {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim(),
        password: form.value.password
      }

      console.log('📝 Données envoyées:', userData)

      await store.register(userData)

      successMessage.value = '✅ Inscription réussie ! Veuillez vous connecter.'
      
      setTimeout(() => {
        isLogin.value = true
        form.value = {
          name: '',
          email: form.value.email,
          phone: '',
          password: '',
          confirmPassword: ''
        }
        successMessage.value = ''
      }, 2000)
    }

  } catch (err) {
    console.error('❌ Erreur complète:', err)
    
    // Essayer d'extraire le message d'erreur du backend
    if (err.response?.data) {
      if (err.response.data.errors) {
        // Erreurs de validation du backend
        const backendErrors = err.response.data.errors.map(e => e.msg || e.message)
        validationErrors.value = backendErrors
        error.value = 'Validation échouée'
      } else if (err.response.data.error) {
        error.value = err.response.data.error
      } else {
        error.value = err.message || 'Une erreur est survenue'
      }
    } else {
      error.value = err.message || 'Une erreur est survenue'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a2a6c 0%, #2d3561 50%, #4a4e69 100%);
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-logo {
  text-align: center;
  margin-bottom: 30px;
}

.auth-logo .bank-icon {
  font-size: 48px;
  display: block;
}

.auth-logo h1 {
  font-size: 28px;
  color: #1a2a6c;
  margin: 10px 0 5px;
}

.auth-logo p {
  color: #7f8c8d;
  font-size: 14px;
}

.auth-form .form-group {
  margin-bottom: 15px;
}

.auth-form .form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.auth-form .form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  background: #f8f9fa;
}

.auth-form .form-group input:focus {
  outline: none;
  border-color: #1a2a6c;
  background: white;
  box-shadow: 0 0 0 3px rgba(26, 42, 108, 0.1);
}

.auth-form .form-group .hint {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 3px;
  display: block;
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  padding: 5px;
}

.toggle-password:hover {
  opacity: 0.7;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  background: #1a2a6c;
  color: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  margin-top: 10px;
}

.btn-primary:hover:not(:disabled) {
  background: #2d3561;
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(26, 42, 108, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-link {
  text-align: center;
  margin-top: 20px;
  color: #7f8c8d;
  font-size: 14px;
}

.switch-link a {
  color: #1a2a6c;
  text-decoration: none;
  font-weight: 600;
}

.switch-link a:hover {
  text-decoration: underline;
}

.demo-hint {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
  font-size: 13px;
  color: #7f8c8d;
}

.demo-hint p {
  margin: 5px 0;
}

.demo-hint strong {
  color: #1a2a6c;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  padding: 10px;
  background: #fde8e8;
  border-radius: 8px;
  margin: 10px 0;
}

.error-message ul {
  margin: 5px 0 0 20px;
  padding: 0;
}

.error-message li {
  margin: 3px 0;
}

.success-message {
  color: #2ecc71;
  font-size: 14px;
  padding: 10px;
  background: #d4edda;
  border-radius: 8px;
  margin: 10px 0;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 25px;
  }
  
  .auth-logo h1 {
    font-size: 24px;
  }
}
</style>