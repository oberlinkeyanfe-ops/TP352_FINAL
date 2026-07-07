export const DEVISE = 'FCFA'

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' ' + DEVISE
}

export const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getTransactionIcon = (type) => {
  const icons = {
    DEPOSIT: '💰',
    WITHDRAWAL: '💸',
    TRANSFER: '🔄',
    EXTERNAL: '🏛️'
  }
  return icons[type] || '💳'
}

export const getTransactionColor = (type) => {
  const colors = {
    DEPOSIT: '#28a745',
    WITHDRAWAL: '#dc3545',
    TRANSFER: '#1a2a6c',
    EXTERNAL: '#ffc107'
  }
  return colors[type] || '#6c757d'
}

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const validatePhone = (phone) => {
  return /^(06|07)[0-9]{8}$|^\+33[6-7][0-9]{8}$/.test(phone)
}