import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BalanceCard from '@/components/BalanceCard.vue'

describe('BalanceCard', () => {
  it('affiche le montant formaté correctement', () => {
    const wrapper = mount(BalanceCard, {
      props: {
        amount: 1500.50,
        label: 'Solde total',
        icon: 'Solde'
      }
    })

    expect(wrapper.text()).toContain('1 500,50 €')
    expect(wrapper.text()).toContain('Solde total')
  })

  it('affiche le subtext quand fourni', () => {
    const wrapper = mount(BalanceCard, {
      props: {
        amount: 2500,
        subtext: 'Disponible immédiatement'
      }
    })

    expect(wrapper.text()).toContain('Disponible immédiatement')
  })

  it('applique la bonne classe variant', () => {
    const wrapper = mount(BalanceCard, {
      props: {
        amount: 1000,
        variant: 'primary'
      }
    })

    expect(wrapper.classes()).toContain('primary')
  })
})
