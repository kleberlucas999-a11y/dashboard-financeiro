'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
import { getMonthLabel, parseMonthId, getMonthId, getCurrentMonthId } from '@/lib/utils'
import { ChevronLeft, ChevronRight, RefreshCw, Clock, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function Header({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { currentMonthId, exchangeRate, setCurrentMonth, setExchangeRate } = useFinanceStore()
  const { year, month } = parseMonthId(currentMonthId)

  const goPrev = () => {
    const d = new Date(year, month - 2, 1)
    setCurrentMonth(getMonthId(d.getFullYear(), d.getMonth() + 1))
  }
  const goNext = () => {
    const d = new Date(year, month, 1)
    setCurrentMonth(getMonthId(d.getFullYear(), d.getMonth() + 1))
  }

  const isCurrentMonth = currentMonthId === getCurrentMonthId()

  const handleRefreshRate = async () => {
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      const data = await res.json()
      setExchangeRate(parseFloat(data.USDBRL.bid))
    } catch {}
  }

  const lastUpdated = exchangeRate.lastUpdated
    ? format(new Date(exchangeRate.lastUpdated), 'HH:mm', { locale: ptBR })
    : '--:--'

  return (
    <header className="bg-[#0d1117] border-b border-[#1a2030] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shrink-0">
      {/* Left: hamburger (mobile) + month nav */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onOpenMenu}
          className="md:hidden p-2 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] transition-all cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <button onClick={goPrev} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] transition-all cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center min-w-[120px] md:min-w-[160px]">
          <h1 className="text-sm md:text-base font-bold text-[#e8ecf4] capitalize">
            {getMonthLabel(year, month)}
          </h1>
          {isCurrentMonth && (
            <span className="text-xs text-[#00d4a0]">mês atual</span>
          )}
        </div>
        <button onClick={goNext} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] transition-all cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Exchange rate — compact on mobile */}
      <div className="flex items-center gap-2">
        {/* Mobile: just rate + refresh */}
        <div className="flex md:hidden items-center gap-1.5 bg-[#07090d] border border-[#1a2030] rounded-xl px-3 py-1.5">
          <span className="text-xs text-[#26a17b] font-medium">USDT</span>
          <span className="text-sm font-mono font-semibold text-[#e8ecf4]">
            R${exchangeRate.rate.toFixed(2)}
          </span>
          <button onClick={handleRefreshRate} className="p-1 rounded text-[#4a5568] hover:text-[#00d4a0] cursor-pointer">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Desktop: full widget */}
        <div className="hidden md:flex items-center gap-2 bg-[#07090d] border border-[#1a2030] rounded-xl px-4 py-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#26a17b] font-medium">USDT/BRL</span>
              <span className="text-base font-mono font-semibold text-[#e8ecf4]">
                R$ {exchangeRate.rate.toFixed(4)}
              </span>
              {exchangeRate.isManual && (
                <span className="text-xs bg-[#f5a020]/20 text-[#f5a020] px-1.5 py-0.5 rounded">manual</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-[#4a5568]" />
              <span className="text-xs text-[#4a5568]">atualizado {lastUpdated}</span>
            </div>
          </div>
          <button
            onClick={handleRefreshRate}
            className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#00d4a0] hover:bg-[#00d4a0]/10 transition-all cursor-pointer"
            title="Atualizar câmbio"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
