'use client'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Receipt, Bitcoin, PieChart, CalendarDays,
  Landmark, History, BellRing, ChevronLeft, ChevronRight,
  TrendingUp, Map, Target, Bot, UserCircle, BookOpen, LogOut, ShoppingCart,
} from 'lucide-react'

const navItems = [
  { id: 'overview',       label: 'Visão Geral',       icon: LayoutDashboard },
  { id: 'bills',          label: 'Contas',             icon: Receipt },
  { id: 'daily',          label: 'Gastos Diários',     icon: ShoppingCart },
  { id: 'usdt',           label: 'USDT / APY',         icon: Bitcoin },
  { id: 'allocation',     label: 'Alocação 50-30-20',  icon: PieChart },
  { id: 'calendar',       label: 'Calendário',         icon: CalendarDays },
  { id: 'accounts',       label: 'Contas Bancárias',   icon: Landmark },
  { id: 'history',        label: 'Histórico',          icon: History },
  { id: 'alerts',         label: 'Alertas',            icon: BellRing },
]

const planningItem = { id: 'planning', label: 'Planejamento', icon: Map }

const personalItems = [
  { id: 'guide',   label: 'Guia Inicial', icon: BookOpen,   color: '#f5a020' },
  { id: 'goals',   label: 'Metas',        icon: Target,     color: '#00d4a0' },
  { id: 'advisor', label: 'Advisor',      icon: Bot,        color: '#6366f1' },
  { id: 'profile', label: 'Perfil',       icon: UserCircle, color: '#8898aa' },
]

export function Sidebar() {
  const { sidebarOpen, activeSection, setSidebarOpen, setActiveSection, userProfile, logout } = useFinanceStore()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    router.push('/auth')
  }

  // When sidebar is collapsed, it expands on hover via CSS group
  const collapsed = !sidebarOpen

  const labelCls = collapsed
    ? 'text-sm font-medium truncate hidden group-hover/sidebar:block'
    : 'text-sm font-medium truncate'

  const itemBaseCls = collapsed
    ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-left justify-center group-hover/sidebar:justify-start'
    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-left'

  const renderItem = (item: typeof navItems[0]) => (
    <button
      key={item.id}
      onClick={() => setActiveSection(item.id)}
      className={cn(
        itemBaseCls,
        activeSection === item.id
          ? 'bg-[#00d4a0]/10 text-[#00d4a0] border border-[#00d4a0]/20'
          : 'text-[#8898aa] hover:bg-[#1a2030] hover:text-[#e8ecf4]',
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="shrink-0" />
      <span className={labelCls}>{item.label}</span>
    </button>
  )

  return (
    <aside
      className={cn(
        'group/sidebar flex flex-col bg-[#0d1117] border-r border-[#1a2030] transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-56 relative' : 'w-16 hover:w-56 sticky top-0 z-30'
      )}
      style={{ minHeight: '100vh', height: '100vh' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-[#1a2030]',
        collapsed && 'justify-center group-hover/sidebar:justify-start'
      )}>
        <div className="w-8 h-8 rounded-lg bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-[#00d4a0]" />
        </div>
        <div className={collapsed ? 'hidden group-hover/sidebar:block' : ''}>
          <p className="text-sm font-bold text-[#e8ecf4] leading-none">FinDash</p>
          <p className="text-xs text-[#4a5568] mt-0.5">Pessoal</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(renderItem)}

        {/* Divider */}
        <div className="my-3 border-t border-[#1a2030]" />

        {/* Planning */}
        <button
          onClick={() => setActiveSection(planningItem.id)}
          className={cn(
            itemBaseCls,
            activeSection === planningItem.id
              ? 'bg-[#f5a020]/10 text-[#f5a020] border border-[#f5a020]/20'
              : 'text-[#8898aa] hover:bg-[#1a2030] hover:text-[#f5a020]',
          )}
          title={collapsed ? planningItem.label : undefined}
        >
          <Map size={18} className="shrink-0" />
          <div className={cn('flex items-center justify-between flex-1 min-w-0', collapsed && 'hidden group-hover/sidebar:flex')}>
            <span className="text-sm font-medium truncate">{planningItem.label}</span>
            <span className="text-xs bg-[#f5a020]/20 text-[#f5a020] px-1.5 py-0.5 rounded-full border border-[#f5a020]/30 ml-1 shrink-0">
              maio
            </span>
          </div>
        </button>

        {/* Personal section divider */}
        <div className="my-3 border-t border-[#1a2030]" />
        <p className={cn('text-xs text-[#1a2030] px-3 mb-1 uppercase tracking-wider', collapsed && 'hidden group-hover/sidebar:block')}>
          Pessoal
        </p>

        {/* Goals / Advisor / Profile / Guide */}
        {personalItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              itemBaseCls,
              activeSection === item.id ? 'border' : 'text-[#8898aa] hover:bg-[#1a2030]',
            )}
            style={activeSection === item.id ? {
              background: `${item.color}18`,
              color: item.color,
              borderColor: `${item.color}33`,
            } : undefined}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} className="shrink-0" style={activeSection === item.id ? { color: item.color } : undefined} />
            <span className={cn(labelCls, activeSection === item.id && 'block')}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User info + logout + toggle */}
      <div className="p-3 border-t border-[#1a2030] space-y-1">
        {/* User avatar + name */}
        {userProfile && (
          <div className={cn(
            'flex items-center gap-2 px-2 py-2 rounded-lg',
            collapsed && 'justify-center group-hover/sidebar:justify-start'
          )}>
            <div className="w-7 h-7 rounded-full bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#00d4a0]">
                {userProfile.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className={cn('flex-1 min-w-0', collapsed && 'hidden group-hover/sidebar:block')}>
              <p className="text-xs font-medium text-[#e8ecf4] truncate">{userProfile.name}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-2 py-2 px-3 rounded-lg',
            'text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 transition-all cursor-pointer',
            collapsed && 'justify-center group-hover/sidebar:justify-start'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={15} className="shrink-0" />
          <span className={collapsed ? 'hidden group-hover/sidebar:inline text-xs' : 'text-xs'}>Sair</span>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
            'text-[#4a5568] hover:text-[#8898aa] hover:bg-[#1a2030] transition-all cursor-pointer'
          )}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          <span className={collapsed ? 'hidden group-hover/sidebar:inline text-xs' : 'text-xs'}>
            {sidebarOpen ? 'Recolher' : 'Expandir'}
          </span>
        </button>
      </div>
    </aside>
  )
}
