<template>
  <form @submit.prevent="handleSubmit" class="transfer-form">
    <div class="form-group">
      <label for="account">Compte source</label>
      <select id="account" v-model="form.accountId" required>
        <option value="">Sélectionnez un compte</option>
        <option v-for="account in accounts" :key="account.id" :value="account.id">
          {{ account.name }} - {{ formatCurrency(account.balance) }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label for="beneficiary">Bénéficiaire</label>
      <input
        id="beneficiary"
        v-model="form.beneficiary"
        type="text"
        placeholder="Nom du bénéficiaire"
        required
      />
    </div>

    <div class="form-group">
      <label for="amount">Montant</label>
      <input
        id="amount"
        v-model="form.amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        required
      />
    </div>

    <div class="form-group">
      <label for="description">Description</label>
      <input
        id="description"
        v-model="form.description"
        type="text"
        placeholder="Motif du virement"
      />
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <button type="submit" class="btn btn-success" :disabled="loading">
      {{ loading ? 'Traitement...' : 'Effectuer le virement' }}
    </button>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBankStore } from '@/stores/bankStore'
import { formatCurrency } from '@/utils/helpers'

const emit = defineEmits(['transfer-success'])

const store = useBankStore()
const accounts = computed(() => store.accounts)

const form = ref({
  accountId: '',
  beneficiary: '',
  amount: '',
  description: ''
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const amount = parseFloat(form.value.amount)

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Veuillez entrer un montant valide')
    }

    if (amount > store.totalBalance) {
      throw new Error('Solde insuffisant')
    }

    await store.transfer({
      accountId: form.value.accountId,
      amount: amount,
      description: form.value.description || `Virement à ${form.value.beneficiary}`
    })

    form.value.accountId = ''
    form.value.beneficiary = ''
    form.value.amount = ''
    form.value.description = ''

    emit('transfer-success')

  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.transfer-form {
  padding: 10px 0;
}
</style>
