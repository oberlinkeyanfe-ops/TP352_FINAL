<template>
  <div class="user-dashboard">
    <!-- En-tête -->
    <header class="dashboard-header">
      <div class="header-left">
        <h1>Bonjour, {{ user?.name }}</h1>
        <p class="welcome-text">Bienvenue sur votre espace bancaire</p>
      </div>
      <div class="header-right">
        <div class="balance-card">
          <span class="balance-label">Solde total</span>
          <span class="balance-amount">{{ formatCurrency(totalBalance) }}</span>
        </div>
        <button @click="logout" class="btn-logout">Déconnexion</button>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Contenu -->
    <div class="tab-content">
      <!-- ACCUEIL -->
      <div v-if="currentTab === 'home'" class="tab-panel">
        <div class="quick-actions">
          <div class="action-grid">
            <button @click="currentTab = 'accounts'" class="action-btn">
              <span class="icon">🏦</span>
              <span>Mes comptes</span>
            </button>
            <button @click="currentTab = 'transfer'" class="action-btn">
              <span class="icon">🔄</span>
              <span>Virement</span>
            </button>
            <button @click="currentTab = 'external'" class="action-btn">
              <span class="icon">🏛️</span>
              <span>Virement externe</span>
            </button>
          </div>
        </div>

        <div class="card transactions-section">
          <div class="section-header">
            <h3>Dernières opérations</h3>
            <span class="text-muted">5 dernières transactions</span>
          </div>
          <div v-if="recentTransactions.length === 0" class="no-data">
            Aucune transaction à afficher
          </div>
          <div v-for="t in recentTransactions" :key="t.id" class="transaction-item">
            <span class="tx-icon">{{ getTransactionIcon(t.type) }}</span>
            <div class="tx-info">
              <span class="tx-desc">{{ t.description || t.type }}</span>
              <span class="tx-date">{{ formatDate(t.created_at) }}</span>
            </div>
            <span class="tx-amount" :class="t.amount > 0 ? 'positive' : 'negative'">
              {{ t.amount > 0 ? '+' : '' }}{{ formatCurrency(t.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- COMPTES -->
      <div v-if="currentTab === 'accounts'" class="tab-panel">
        <div class="panel-header">
          <h2>Mes comptes bancaires</h2>
          <button class="btn btn-primary" @click="showCreateAccount = true">
            Ouvrir un compte
          </button>
        </div>

        <div class="accounts-grid">
          <div v-for="account in accounts" :key="account.id" class="account-card">
            <div class="account-header">
              <span class="account-type">
                {{ account.account_type === 'CHECKING' ? 'Compte courant' : 'Compte épargne' }}
              </span>
              <span class="account-status" :class="account.balance > 0 ? 'active' : 'inactive'">
                {{ account.balance > 0 ? 'Actif' : 'Inactif' }}
              </span>
            </div>
            <div class="account-body">
              <p class="account-number">{{ account.account_number }}</p>
              <p class="account-balance">{{ formatCurrency(account.balance) }}</p>
              <p class="account-bank">{{ account.bank_name }}</p>
            </div>
            <div class="account-actions">
              <button @click="selectAccount(account)" class="btn btn-primary btn-sm">
                Gérer
              </button>
              <button v-if="account.balance === 0" @click="closeAccount(account.id)" class="btn btn-danger btn-sm">
                Fermer
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL : CRÉATION COMPTE -->
        <div v-if="showCreateAccount" class="modal-overlay" @click.self="showCreateAccount = false">
          <div class="modal">
            <div class="modal-header">
              <h2>Ouvrir un compte bancaire</h2>
              <button @click="showCreateAccount = false" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <!-- AFFICHAGE DES ERREURS DU BACKEND -->
              <div v-if="createError" class="error-message">
                <strong>❌ Erreur :</strong> {{ createError }}
              </div>
              <div v-if="createSuccess" class="success-message">
                ✅ {{ createSuccess }}
              </div>

              <div class="form-group">
                <label>Type de compte</label>
                <select v-model="newAccount.accountType">
                  <option value="CHECKING">Compte courant</option>
                  <option value="SAVINGS">Compte épargne</option>
                </select>
              </div>

              <div class="form-group">
                <label>Banque du nouveau compte</label>
                <select v-model="newAccount.bankId">
                  <option v-for="bank in banks" :key="bank.id" :value="bank.id">
                    {{ bank.name }}
                  </option>
                </select>
              </div>

              <hr class="divider" />

              <h4>Alimentation du compte</h4>
              <p class="text-muted">Un montant minimum de 50.000 FCFA est requis.</p>

              <div class="form-group">
                <label>Montant à transférer (FCFA)</label>
                <input 
                  v-model="newAccount.amount" 
                  type="number" 
                  min="50000" 
                  placeholder="50000"
                />
              </div>

              <div class="form-group">
                <label>Numéro du compte source (pour alimentation)</label>
                <input 
                  v-model="newAccount.sourceAccountNumber" 
                  placeholder="ACC-XXXXXXXX"
                />
                <small class="hint">Entrez le numéro du compte existant qui sera débité</small>
              </div>

              <div class="form-group">
                <label>Banque du compte source</label>
                <select v-model="newAccount.sourceBankId">
                  <option v-for="bank in banks" :key="bank.id" :value="bank.id">
                    {{ bank.name }}
                  </option>
                </select>
              </div>

              <button class="btn btn-success" @click="createAccount" :disabled="loading">
                {{ loading ? 'Vérification en cours...' : 'Ouvrir le compte' }}
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL : GESTION COMPTE -->
        <div v-if="selectedAccount" class="modal-overlay" @click.self="selectedAccount = null">
          <div class="modal modal-large">
            <div class="modal-header">
              <h2>Gestion du compte</h2>
              <button @click="selectedAccount = null" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <!-- Affichage des erreurs -->
              <div v-if="operationError" class="error-message">
                <strong>❌ Erreur :</strong> {{ operationError }}
              </div>
              <div v-if="operationSuccess" class="success-message">
                ✅ {{ operationSuccess }}
              </div>

              <div class="account-detail">
                <div class="detail-row">
                  <span class="detail-label">Numéro de compte</span>
                  <span class="detail-value">{{ selectedAccount.account_number }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ selectedAccount.account_type === 'CHECKING' ? 'Compte courant' : 'Compte épargne' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Solde</span>
                  <span class="detail-value">{{ formatCurrency(selectedAccount.balance) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Banque</span>
                  <span class="detail-value">{{ selectedAccount.bank_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Statut</span>
                  <span class="detail-value" :class="selectedAccount.balance > 0 ? 'active' : 'inactive'">
                    {{ selectedAccount.balance > 0 ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
              </div>

              <hr class="divider" />

              <div class="account-operations">
                <h3>Opérations</h3>
                <div class="operation-grid">
                  <div class="operation-card">
                    <h4>Dépôt</h4>
                    <div class="form-group">
                      <input v-model="operationDeposit.amount" type="number" placeholder="Montant" />
                      <input v-model="operationDeposit.sourceBank" placeholder="Banque source" />
                      <input v-model="operationDeposit.sourceAccount" placeholder="Compte source" />
                    </div>
                    <button class="btn btn-success btn-sm" @click="handleDepositOnAccount" :disabled="loadingOp">
                      Effectuer le dépôt
                    </button>
                  </div>

                  <div class="operation-card">
                    <h4>Retrait</h4>
                    <div class="form-group">
                      <input v-model="operationWithdraw.amount" type="number" placeholder="Montant" />
                    </div>
                    <button class="btn btn-warning btn-sm" @click="handleWithdrawOnAccount" :disabled="loadingOp">
                      Effectuer le retrait
                    </button>
                  </div>

                  <div class="operation-card">
                    <h4>Bloquer / Débloquer</h4>
                    <button class="btn btn-danger btn-sm" @click="toggleBlockAccount" :disabled="loadingOp">
                      {{ selectedAccount.isBlocked ? 'Débloquer' : 'Bloquer' }}
                    </button>
                  </div>

                  <div class="operation-card">
                    <h4>Supprimer</h4>
                    <button class="btn btn-danger btn-sm" @click="deleteSelectedAccount" :disabled="loadingOp">
                      Supprimer le compte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TRANSFERT ENTRE COMPTES -->
      <div v-if="currentTab === 'transfer'" class="tab-panel">
        <div class="panel-header">
          <h2>Virement entre comptes</h2>
        </div>
        <div class="card form-card">
          <!-- AFFICHAGE DES ERREURS DU BACKEND -->
          <div v-if="transferError" class="error-message">
            <strong>❌ Erreur :</strong> {{ transferError }}
          </div>
          <div v-if="transferSuccess" class="success-message">
            ✅ {{ transferSuccess }}
          </div>

          <div class="form-group">
            <label>Compte source</label>
            <select v-model="transferForm.fromAccountId">
              <option value="">Sélectionnez un compte</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.account_number }} - {{ formatCurrency(acc.balance) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Compte destination</label>
            <select v-model="transferForm.toAccountId">
              <option value="">Sélectionnez un compte</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.account_number }} - {{ formatCurrency(acc.balance) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Montant (FCFA)</label>
            <input v-model="transferForm.amount" type="number" min="1" placeholder="0" />
          </div>

          <div class="form-group">
            <label>Description (optionnelle)</label>
            <input v-model="transferForm.description" type="text" placeholder="Motif du virement" />
          </div>

          <button class="btn btn-primary" @click="handleTransfer" :disabled="loading">
            {{ loading ? 'Traitement...' : 'Effectuer le virement' }}
          </button>
        </div>
      </div>

      <!-- VIREMENT EXTERNE -->
      <div v-if="currentTab === 'external'" class="tab-panel">
        <div class="panel-header">
          <h2>Virement externe</h2>
        </div>
        <div class="card form-card">
          <!-- AFFICHAGE DES ERREURS DU BACKEND -->
          <div v-if="externalError" class="error-message">
            <strong>❌ Erreur :</strong> {{ externalError }}
          </div>
          <div v-if="externalSuccess" class="success-message">
            ✅ {{ externalSuccess }}
          </div>

          <div class="form-group">
            <label>Compte source</label>
            <select v-model="externalForm.fromAccountId">
              <option value="">Sélectionnez un compte</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.account_number }} - {{ formatCurrency(acc.balance) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Banque destination</label>
            <input v-model="externalForm.toBank" placeholder="BNP Paribas" />
            <small class="hint">Nom de la banque réceptrice</small>
          </div>

          <div class="form-group">
            <label>Compte destination</label>
            <input v-model="externalForm.toAccount" placeholder="FR76 9876 5432 1098 7654" />
            <small class="hint">Numéro de compte IBAN ou national</small>
          </div>

          <div class="form-group">
            <label>Montant (FCFA)</label>
            <input v-model="externalForm.amount" type="number" min="1" placeholder="0" />
          </div>

          <div class="form-group">
            <label>Description (optionnelle)</label>
            <input v-model="externalForm.description" type="text" placeholder="Motif du virement" />
          </div>

          <button class="btn btn-primary" @click="handleExternalTransfer" :disabled="loading">
            {{ loading ? 'Traitement...' : 'Effectuer le virement externe' }}
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
import { formatCurrency, formatDate, getTransactionIcon } from '@/utils/helpers'

const router = useRouter()
const store = useBankStore()

// ==================== COMPUTED ====================
const user = computed(() => store.user)
const accounts = computed(() => store.accounts)
const totalBalance = computed(() => store.totalBalance)
const recentTransactions = computed(() => store.recentTransactions)
const banks = ref([])

// ==================== ETATS ====================
const currentTab = ref('home')
const loading = ref(false)
const loadingOp = ref(false)

// Messages d'erreur/succès par section
const operationError = ref('')
const operationSuccess = ref('')
const transferError = ref('')
const transferSuccess = ref('')
const externalError = ref('')
const externalSuccess = ref('')
const createError = ref('')
const createSuccess = ref('')

const tabs = [
  { id: 'home', label: 'Accueil' },
  { id: 'accounts', label: 'Comptes' },
  { id: 'transfer', label: 'Virement' },
  { id: 'external', label: 'Virement externe' }
]

// ==================== CRÉATION COMPTE ====================
const showCreateAccount = ref(false)

const newAccount = ref({
  accountType: 'CHECKING',
  bankId: 1,
  amount: 50000,
  sourceAccountNumber: '',
  sourceBankId: 1
})

// ==================== GESTION COMPTE ====================
const selectedAccount = ref(null)
const operationDeposit = ref({ amount: '', sourceBank: '', sourceAccount: '' })
const operationWithdraw = ref({ amount: '' })

// ==================== FORMULAIRES ====================
const transferForm = ref({ fromAccountId: '', toAccountId: '', amount: '', description: '' })
const externalForm = ref({ fromAccountId: '', toBank: '', toAccount: '', amount: '', description: '' })

// ==================== CHARGEMENT BANQUES ====================
const loadBanks = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/banks')
    const data = await response.json()
    banks.value = data
  } catch (err) {
    console.error('Erreur chargement banques:', err)
  }
}

// ==================== CRÉATION COMPTE ====================
const createAccount = async () => {
  loading.value = true
  createError.value = ''
  createSuccess.value = ''

  try {
    const amount = parseFloat(newAccount.value.amount)
    
    if (isNaN(amount) || amount < 50000) {
      throw new Error('Le montant minimum est de 50.000 FCFA')
    }

    const sourceAccountNumber = newAccount.value.sourceAccountNumber.trim()
    if (!sourceAccountNumber || sourceAccountNumber.length < 10) {
      throw new Error('Numéro de compte source invalide (minimum 10 caractères)')
    }

    // Appel API - Le backend va vérifier tout le reste
    const result = await store.createAccount({
      accountType: newAccount.value.accountType,
      bankId: newAccount.value.bankId,
      initialBalance: 0
    })

    // Faire le transfert depuis le compte source
    await store.transfer({
      fromAccountId: null, // Le backend va trouver par le numéro
      toAccountId: result.account.id,
      amount: amount,
      description: `Alimentation nouveau compte ${result.account.account_number}`,
      sourceAccountNumber: sourceAccountNumber // On passe le numéro
    })

    createSuccess.value = `✅ Compte créé avec succès ! ${formatCurrency(amount)} ont été transférés.`
    store.setNotification('Compte créé avec succès', 'success')

    setTimeout(() => {
      showCreateAccount.value = false
      newAccount.value = {
        accountType: 'CHECKING',
        bankId: 1,
        amount: 50000,
        sourceAccountNumber: '',
        sourceBankId: 1
      }
      createSuccess.value = ''
      createError.value = ''
    }, 3000)

  } catch (err) {
    // Affiche l'erreur du backend
    createError.value = err
  } finally {
    loading.value = false
  }
}

// ==================== TRANSFERT ENTRE COMPTES ====================
const handleTransfer = async () => {
  loading.value = true
  transferError.value = ''
  transferSuccess.value = ''

  try {
    const fromAccountId = parseInt(transferForm.value.fromAccountId)
    const toAccountId = parseInt(transferForm.value.toAccountId)
    const amount = parseFloat(transferForm.value.amount)

    if (!fromAccountId || isNaN(fromAccountId)) {
      throw new Error('Veuillez sélectionner un compte source')
    }

    if (!toAccountId || isNaN(toAccountId)) {
      throw new Error('Veuillez sélectionner un compte destination')
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Veuillez entrer un montant valide')
    }

    await store.transfer({
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: amount,
      description: transferForm.value.description || `Virement vers compte ${toAccountId}`
    })

    transferSuccess.value = `✅ Virement de ${formatCurrency(amount)} effectué avec succès !`
    store.setNotification('Virement effectué avec succès', 'success')
    
    transferForm.value = { fromAccountId: '', toAccountId: '', amount: '', description: '' }

  } catch (err) {
    // Affiche l'erreur du backend (ex: "Solde insuffisant", "Compte non trouvé", etc.)
    transferError.value = err
  } finally {
    loading.value = false
  }
}

// ==================== VIREMENT EXTERNE ====================
const handleExternalTransfer = async () => {
  loading.value = true
  externalError.value = ''
  externalSuccess.value = ''

  try {
    const fromAccountId = parseInt(externalForm.value.fromAccountId)
    const amount = parseFloat(externalForm.value.amount)
    const toBank = externalForm.value.toBank?.trim()
    const toAccount = externalForm.value.toAccount?.trim()

    if (!fromAccountId || isNaN(fromAccountId)) {
      throw new Error('Veuillez sélectionner un compte source')
    }

    if (!toBank || toBank.length < 2) {
      throw new Error('Veuillez entrer le nom de la banque destination')
    }

    if (!toAccount || toAccount.length < 5) {
      throw new Error('Veuillez entrer un numéro de compte destination valide')
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Veuillez entrer un montant valide')
    }

    await store.externalTransfer({
      fromAccountId: fromAccountId,
      toBank: toBank,
      toAccount: toAccount,
      amount: amount,
      description: externalForm.value.description || `Virement externe vers ${toBank}`
    })

    externalSuccess.value = `✅ Virement externe de ${formatCurrency(amount)} vers ${toBank} effectué avec succès !`
    store.setNotification('Virement externe effectué avec succès', 'success')
    
    externalForm.value = { fromAccountId: '', toBank: '', toAccount: '', amount: '', description: '' }

  } catch (err) {
    // Affiche l'erreur du backend
    externalError.value = err
  } finally {
    loading.value = false
  }
}

// ==================== SÉLECTION COMPTE ====================
const selectAccount = (account) => {
  selectedAccount.value = { ...account, isBlocked: false }
  operationDeposit.value = { amount: '', sourceBank: '', sourceAccount: '' }
  operationWithdraw.value = { amount: '' }
  operationError.value = ''
  operationSuccess.value = ''
}

// ==================== DÉPÔT SUR COMPTE ====================
const handleDepositOnAccount = async () => {
  if (!selectedAccount.value) return
  loadingOp.value = true
  operationError.value = ''
  operationSuccess.value = ''

  try {
    const amount = parseFloat(operationDeposit.value.amount)
    const sourceBank = operationDeposit.value.sourceBank?.trim()
    const sourceAccount = operationDeposit.value.sourceAccount?.trim()

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Veuillez entrer un montant valide')
    }

    if (!sourceBank || sourceBank.length < 2) {
      throw new Error('Veuillez entrer le nom de la banque source')
    }

    await store.deposit({
      accountId: selectedAccount.value.id,
      amount: amount,
      sourceBank: sourceBank,
      sourceAccount: sourceAccount || 'Inconnu'
    })

    operationSuccess.value = `✅ Dépôt de ${formatCurrency(amount)} effectué avec succès !`
    store.setNotification('Dépôt effectué avec succès', 'success')
    operationDeposit.value = { amount: '', sourceBank: '', sourceAccount: '' }
    
    const updated = accounts.value.find(a => a.id === selectedAccount.value.id)
    if (updated) selectedAccount.value = { ...updated }

  } catch (err) {
    // Affiche l'erreur du backend (ex: "Compte bloqué", "Plafond dépassé", etc.)
    operationError.value = err
  } finally {
    loadingOp.value = false
  }
}

// ==================== RETRAIT SUR COMPTE ====================
const handleWithdrawOnAccount = async () => {
  if (!selectedAccount.value) return
  loadingOp.value = true
  operationError.value = ''
  operationSuccess.value = ''

  try {
    const amount = parseFloat(operationWithdraw.value.amount)

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Veuillez entrer un montant valide')
    }

    await store.withdraw({
      accountId: selectedAccount.value.id,
      amount: amount
    })

    operationSuccess.value = `✅ Retrait de ${formatCurrency(amount)} effectué avec succès !`
    store.setNotification('Retrait effectué avec succès', 'success')
    operationWithdraw.value = { amount: '' }
    
    const updated = accounts.value.find(a => a.id === selectedAccount.value.id)
    if (updated) selectedAccount.value = { ...updated }

  } catch (err) {
    // Affiche l'erreur du backend (ex: "Solde insuffisant", "Compte bloqué", etc.)
    operationError.value = err
  } finally {
    loadingOp.value = false
  }
}

// ==================== BLOQUER/DÉBLOQUER ====================
const toggleBlockAccount = async () => {
  if (!selectedAccount.value) return
  loadingOp.value = true
  try {
    selectedAccount.value.isBlocked = !selectedAccount.value.isBlocked
    store.setNotification(
      selectedAccount.value.isBlocked ? 'Compte bloqué' : 'Compte débloqué',
      'warning'
    )
  } finally {
    loadingOp.value = false
  }
}

// ==================== SUPPRIMER COMPTE ====================
const deleteSelectedAccount = async () => {
  if (!selectedAccount.value) return
  if (!confirm('Voulez-vous vraiment supprimer ce compte ? Cette action est irréversible.')) return

  loadingOp.value = true
  operationError.value = ''
  
  try {
    await store.closeAccount(selectedAccount.value.id)
    store.setNotification('Compte supprimé', 'warning')
    selectedAccount.value = null
  } catch (err) {
    operationError.value = err
  } finally {
    loadingOp.value = false
  }
}

// ==================== FERMER COMPTE ====================
const closeAccount = async (id) => {
  if (!confirm('Voulez-vous vraiment fermer ce compte ?')) return
  
  try {
    await store.closeAccount(id)
    store.setNotification('Compte fermé', 'warning')
  } catch (err) {
    store.setNotification(err, 'error')
  }
}

// ==================== DÉCONNEXION ====================
const logout = () => {
  store.logout()
  router.push('/login')
}

// ==================== MOUNT ====================
onMounted(async () => {
  await loadBanks()
  await store.fetchAccounts()
  await store.fetchTransactions()
})
</script>

<style scoped>
.user-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ===== HEADER ===== */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-left h1 {
  font-size: 24px;
  color: #1a2a6c;
  margin: 0;
}

.welcome-text {
  color: #6c757d;
  font-size: 14px;
  margin: 5px 0 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.balance-card {
  text-align: right;
  padding: 10px 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.balance-label {
  font-size: 12px;
  color: #6c757d;
  display: block;
}

.balance-amount {
  font-size: 22px;
  font-weight: bold;
  color: #1a2a6c;
}

.btn-logout {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-logout:hover {
  background: #c82333;
}

/* ===== TABS ===== */
.tab-navigation {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  background: white;
  padding: 8px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.tab-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  color: #6c757d;
  font-weight: 600;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-btn:hover {
  background: #f8f9fa;
  color: #1a2a6c;
}

.tab-btn.active {
  background: #1a2a6c;
  color: white;
}

.tab-content {
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* ===== PANEL HEADER ===== */
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
  font-size: 20px;
}

/* ===== ACTIONS ===== */
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  color: #2c3e50;
}

.action-btn:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.action-btn .icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.action-btn span:last-child {
  font-size: 14px;
  font-weight: 500;
}

/* ===== ACCOUNTS GRID ===== */
.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.account-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #e9ecef;
  transition: all 0.2s;
}

.account-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.account-type {
  font-weight: 600;
  font-size: 15px;
  color: #1a2a6c;
}

.account-status {
  font-size: 12px;
  padding: 2px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.account-status.active {
  background: #d4edda;
  color: #155724;
}

.account-status.inactive {
  background: #f8d7da;
  color: #721c24;
}

.account-number {
  font-size: 13px;
  color: #6c757d;
  margin: 5px 0;
  font-family: monospace;
}

.account-balance {
  font-size: 22px;
  font-weight: bold;
  color: #1a2a6c;
  margin: 5px 0;
}

.account-bank {
  font-size: 13px;
  color: #6c757d;
}

.account-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

/* ===== BUTTONS ===== */
.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #1a2a6c;
  color: white;
}
.btn-primary:hover {
  background: #2d3561;
}

.btn-success {
  background: #28a745;
  color: white;
}
.btn-success:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}
.btn-danger:hover {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}
.btn-warning:hover {
  background: #e0a800;
}

.btn-sm {
  padding: 5px 14px;
  font-size: 13px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== FORM ===== */
.form-card {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1a2a6c;
  box-shadow: 0 0 0 3px rgba(26, 42, 108, 0.1);
}

/* ===== HINT ===== */
.hint {
  display: block;
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.hint.error {
  color: #dc3545;
}

/* ===== TRANSACTIONS ===== */
.transaction-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f5;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  font-size: 24px;
}

.tx-info {
  flex: 1;
}

.tx-desc {
  font-weight: 500;
  display: block;
  color: #2c3e50;
}

.tx-date {
  font-size: 12px;
  color: #6c757d;
}

.tx-amount {
  font-weight: 600;
  font-size: 16px;
}

.tx-amount.positive {
  color: #28a745;
}

.tx-amount.negative {
  color: #dc3545;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
  color: #1a2a6c;
  font-size: 18px;
}

.text-muted {
  color: #6c757d;
  font-size: 13px;
}

.no-data {
  text-align: center;
  padding: 30px;
  color: #6c757d;
}

.divider {
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 20px 0;
}

/* ===== MODAL ===== */
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 700px;
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
  font-size: 20px;
}

.modal-header h4 {
  margin: 10px 0 5px;
  color: #1a2a6c;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6c757d;
}

.close-btn:hover {
  color: #2c3e50;
}

/* ===== MESSAGES ===== */
.error-message {
  color: #721c24;
  font-size: 14px;
  padding: 10px;
  background: #f8d7da;
  border-radius: 6px;
  margin: 10px 0;
  border: 1px solid #f5c6cb;
}

.success-message {
  color: #155724;
  font-size: 14px;
  padding: 10px;
  background: #d4edda;
  border-radius: 6px;
  margin: 10px 0;
  border: 1px solid #c3e6cb;
}

/* ===== ACCOUNT DETAIL ===== */
.account-detail {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #6c757d;
}

.detail-value {
  font-weight: 600;
  color: #2c3e50;
}

/* ===== OPERATIONS ===== */
.operation-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .operation-grid {
    grid-template-columns: 1fr;
  }
}

.operation-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.operation-card h4 {
  margin: 0 0 10px;
  color: #1a2a6c;
  font-size: 15px;
}

.operation-card .form-group input {
  margin-bottom: 8px;
}

.transactions-section {
  margin-top: 20px;
}
</style>