'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFinanceStore } from '@/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { OverviewWidget } from '@/components/dashboard/OverviewWidget'
import { BillsManagement } from '@/components/dashboard/BillsManagement'
import { USDTManagement } from '@/components/dashboard/USDTManagement'
import { AllocationWidget } from '@/components/dashboard/AllocationWidget'
import { MonthlyCalendar } from '@/components/dashboard/MonthlyCalendar'
import { BankAccounts } from '@/components/dashboard/BankAccounts'
import { MonthlyHistory } from '@/components/dashboard/MonthlyHistory'
import { AlertsWidget } from '@/components/dashboard/AlertsWidget'
import { PlanningWidget } from '@/components/dashboard/PlanningWidget'
import { ExchangeRatePoller } from '@/components/dashboard/ExchangeRateWidget'
import { GoalsWidget } from '@/components/dashboard/GoalsWidget'
import { AdvisorWidget } from '@/components/dashboard/AdvisorWidget'
import { ProfileWidget } from '@/components/dashboard/ProfileWidget'
import { GuideWidget } from '@/components/dashboard/GuideWidget'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

const SECTION_TITLES: Record<string, string> = {
  overview: 'Visão Geral',
  bills: 'Gestão de Contas',
  usdt: 'USDT & APY',
  allocation: 'Alocação 50-30-20',
  calendar: 'Calendário Mensal',
  accounts: 'Contas Bancárias',
  history: 'Histórico Mensal',
  alerts: 'Alertas Inteligentes',
  planning: 'Planejamento',
  guide: 'Guia de Início Rápido',
  goals: 'Metas Financeiras',
  advisor: 'Advisor Financeiro',
  profile: 'Meu Perfil',
}

const SECTION_SUBS: Record<string, string> = {
  overview: 'Resumo financeiro do mês',
  bills: 'CRUD de contas fixas e variáveis',
  usdt: 'Câmbio, conversões e projeção APY',
  allocation: 'Distribuição do saldo livre',
  calendar: 'Eventos e vencimentos do mês',
  accounts: 'Saldo por conta bancária',
  history: 'Evolução mês a mês',
  alerts: 'Notificações e recomendações',
  planning: 'Insights, ordem de pagamento e estratégia mensal',
  guide: 'Passo a passo para configurar o dashboard hoje',
  goals: 'Rastreie e acelere seus objetivos financeiros',
  advisor: 'Consultor pessoal com IA · baseado na sua situação real',
  profile: 'Configurações pessoais e preferências',
}

export default function Dashboard() {
  const { activeSection, userProfile, loadFromSupabase, syncToSupabase, userId } = useFinanceStore()
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)
  const syncStatus = useSupabaseSync()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Fetch user data from Supabase
      const { data: row } = await supabase
        .from('user_data')
        .select('store_data')
        .eq('user_id', user.id)
        .single()

      if (row?.store_data) {
        // Load server data into store
        loadFromSupabase(user.id, row.store_data)
      } else {
        // No server data yet — migrate localStorage data if it exists
        loadFromSupabase(user.id, {})
        // Immediately save current localStorage state to Supabase
        setTimeout(() => syncToSupabase(), 500)
      }

      setInitializing(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center animate-pulse">
            <span className="text-[#00d4a0] text-lg font-bold">F</span>
          </div>
          <p className="text-sm text-[#4a5568]">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  // Show onboarding wizard if not completed
  if (!userProfile?.onboardingComplete) {
    return <OnboardingWizard />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090d]">
      <ExchangeRatePoller />
      <Sidebar />

      {/* Sync status indicator — bottom-right corner */}
      {syncStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
          syncStatus === 'saving' ? 'bg-[#0d1117] border-[#1a2030] text-[#4a5568]' :
          syncStatus === 'saved'  ? 'bg-[#00d4a0]/10 border-[#00d4a0]/30 text-[#00d4a0]' :
          'bg-[#f06060]/10 border-[#f06060]/30 text-[#f06060]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            syncStatus === 'saving' ? 'bg-[#4a5568] animate-pulse' :
            syncStatus === 'saved'  ? 'bg-[#00d4a0]' : 'bg-[#f06060]'
          }`} />
          {syncStatus === 'saving' ? 'Salvando...' : syncStatus === 'saved' ? 'Salvo ✓' : 'Erro ao salvar'}
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Section header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#e8ecf4]">{SECTION_TITLES[activeSection]}</h2>
            <p className="text-sm text-[#4a5568] mt-0.5">{SECTION_SUBS[activeSection]}</p>
          </div>

          {/* Section content */}
          {activeSection === 'overview' && <OverviewWidget />}
          {activeSection === 'bills' && <BillsManagement />}
          {activeSection === 'usdt' && <USDTManagement />}
          {activeSection === 'allocation' && <AllocationWidget />}
          {activeSection === 'calendar' && <MonthlyCalendar />}
          {activeSection === 'accounts' && <BankAccounts />}
          {activeSection === 'history' && <MonthlyHistory />}
          {activeSection === 'alerts' && <AlertsWidget />}
          {activeSection === 'planning' && <PlanningWidget />}
          {activeSection === 'guide' && <GuideWidget />}
          {activeSection === 'goals' && <GoalsWidget />}
          {activeSection === 'advisor' && <AdvisorWidget />}
          {activeSection === 'profile' && <ProfileWidget />}
        </main>
      </div>
    </div>
  )
}
