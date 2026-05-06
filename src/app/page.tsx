'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
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
  const { activeSection, userProfile } = useFinanceStore()

  // Show onboarding wizard if not completed
  if (!userProfile?.onboardingComplete) {
    return <OnboardingWizard />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090d]">
      <ExchangeRatePoller />
      <Sidebar />

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
