'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Dialog } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  formatBRL, formatUSDT, calcUSDTInBRL, calcMonthlyAPYReturn,
  calcAPYProjection, calcMinUSDTToConvert, calcUSDTNet,
} from '@/lib/utils'
import { Plus, Trash2, ArrowRight, Info, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-[#243048] rounded-xl p-3 text-xs shadow-xl">
      <p className="text-[#8898aa] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono" style={{ color: p.color }}>{p.name}: {formatUSDT(p.value)}</p>
      ))}
    </div>
  )
}

export function USDTManagement() {
  const { currentMonthId, getCurrentMonth, exchangeRate, updateUSDTSettings, addConversion, deleteConversion } = useFinanceStore()
  const month = getCurrentMonth()
  const [showConvForm, setShowConvForm] = useState(false)
  const [convForm, setConvForm] = useState({ usdtAmount: '', description: '' })

  if (!month) return null

  const isMay2025 = month.id === '2025-05'
  const settings = month.usdtSettings
  const rate = month.exchangeRate || exchangeRate.rate

  // Core amounts
  const grossAmount = settings.grossAmount ?? settings.monthlyAmount
  const discount = settings.discount ?? 0
  const netAmount = calcUSDTNet(month)   // monthlyAmount = gross - discount

  const usdtTithe = netAmount * 0.1
  const usdtAvailable = netAmount - usdtTithe

  const minToConvert = calcMinUSDTToConvert(month)
  const apyUSDT = Math.max(0, usdtAvailable - minToConvert)

  const totalBRL = calcUSDTInBRL(netAmount, rate)
  const convertBRL = calcUSDTInBRL(netAmount * (settings.convertPercent / 100), rate)
  const monthlyReturn = calcMonthlyAPYReturn(apyUSDT, settings.apyPercent)

  const projections = [3, 6, 12].map((m) => ({
    months: m,
    gain: calcAPYProjection(apyUSDT, settings.apyPercent, m),
    total: apyUSDT + calcAPYProjection(apyUSDT, settings.apyPercent, m),
  }))

  const chartData = Array.from({ length: 13 }, (_, i) => ({
    mes: `M+${i}`,
    saldo: apyUSDT + calcAPYProjection(apyUSDT, settings.apyPercent, i),
    rendimento: calcAPYProjection(apyUSDT, settings.apyPercent, i),
  }))

  const handleConvert = () => {
    const usdtAmt = parseFloat(convForm.usdtAmount)
    if (!usdtAmt) return
    addConversion(currentMonthId, {
      date: new Date().toISOString(),
      usdtAmount: usdtAmt,
      brlAmount: calcUSDTInBRL(usdtAmt, rate),
      rate,
      description: convForm.description,
    })
    setConvForm({ usdtAmount: '', description: '' })
    setShowConvForm(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* May 2025: gross/discount/net breakdown */}
      {isMay2025 && settings.grossAmount !== undefined && (
        <Card className="border-[#26a17b]/40">
          <CardHeader><CardTitle>Entrada USDT — Maio 2025</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#07090d] rounded-xl border border-[#1a2030]">
                <p className="text-xs text-[#8898aa] mb-2">Bruto (plataforma)</p>
                <p className="text-xl font-mono font-bold text-[#e8ecf4]">{formatUSDT(grossAmount)}</p>
                <p className="text-xs text-[#4a5568] mt-1">{formatBRL(calcUSDTInBRL(grossAmount, rate))}</p>
              </div>
              <div className="p-4 bg-[#f06060]/08 rounded-xl border border-[#f06060]/30">
                <p className="text-xs text-[#f06060] mb-2">Desconto especial</p>
                <p className="text-xl font-mono font-bold text-[#f06060]">− {formatUSDT(discount)}</p>
                <p className="text-xs text-[#f06060]/70 mt-1 leading-snug">{settings.discountLabel}</p>
              </div>
              <div className="p-4 bg-[#26a17b]/08 rounded-xl border border-[#26a17b]/40">
                <p className="text-xs text-[#26a17b] mb-2">Líquido (o que chega)</p>
                <p className="text-xl font-mono font-bold text-[#26a17b]">{formatUSDT(netAmount)}</p>
                <p className="text-xs text-[#4a5568] mt-1">{formatBRL(calcUSDTInBRL(netAmount, rate))}</p>
              </div>
            </div>
            {/* Edit gross/discount */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Input
                label="USDT bruto"
                type="number"
                suffix="USDT"
                value={settings.grossAmount || ''}
                onChange={(e) => {
                  const g = parseFloat(e.target.value) || 0
                  const d = settings.discount || 0
                  updateUSDTSettings(currentMonthId, { grossAmount: g, monthlyAmount: g - d })
                }}
              />
              <Input
                label={`Desconto — ${settings.discountLabel || 'especial'}`}
                type="number"
                suffix="USDT"
                value={settings.discount || ''}
                onChange={(e) => {
                  const d = parseFloat(e.target.value) || 0
                  const g = settings.grossAmount || 0
                  updateUSDTSettings(currentMonthId, { discount: d, monthlyAmount: g - d })
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'USDT Líquido', value: formatUSDT(netAmount), sub: formatBRL(totalBRL), color: '#26a17b' },
          { label: 'Dízimo USDT (10%)', value: formatUSDT(usdtTithe), sub: formatBRL(usdtTithe * rate), color: '#f5a020' },
          { label: 'Mín. a Converter', value: formatUSDT(minToConvert), sub: formatBRL(minToConvert * rate), color: '#f06060' },
          { label: 'Fica em APY', value: formatUSDT(apyUSDT), sub: `${settings.apyPercent}% a.a. → +${formatUSDT(monthlyReturn)}/mês`, color: '#6366f1' },
        ].map((item) => (
          <Card key={item.label} className="hover:border-[#243048] transition-colors">
            <CardContent className="p-5">
              <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">{item.label}</p>
              <p className="text-xl font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-[#4a5568] mt-1 font-mono">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Minimum to convert breakdown (May 2025) */}
      {isMay2025 && (
        <Card>
          <CardHeader><CardTitle>Cálculo: Mínimo a Converter</CardTitle></CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-[#07090d] rounded-xl border border-[#1a2030]">
                <p className="text-xs text-[#8898aa] mb-1">Contas maio (BRL)</p>
                <p className="font-mono text-[#e8ecf4]">{formatBRL(month.bills.filter(b=>b.status!=='quitado').reduce((s,b)=>s+b.amount,0))}</p>
              </div>
              <div className="p-3 bg-[#f06060]/08 rounded-xl border border-[#f06060]/30">
                <p className="text-xs text-[#f06060] mb-1">Atrasados abril (BRL)</p>
                <p className="font-mono text-[#f06060]">{formatBRL((month.overdueBills||[]).filter(b=>b.status!=='pago').reduce((s,b)=>s+b.amount,0))}</p>
              </div>
              <div className="p-3 bg-[#07090d] rounded-xl border border-[#243048]">
                <p className="text-xs text-[#8898aa] mb-1">+ Margem</p>
                <p className="font-mono text-[#e8ecf4]">{formatUSDT(60)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#f06060]/08 rounded-xl border border-[#f06060]/30">
              <span className="text-sm text-[#e8ecf4]">Total em USDT (à taxa {rate.toFixed(4)})</span>
              <span className="text-lg font-mono font-bold text-[#f06060]">{formatUSDT(minToConvert)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#26a17b]/08 rounded-xl border border-[#26a17b]/30">
              <span className="text-sm text-[#26a17b]">Disponível − dízimo − mínimo a converter = APY</span>
              <span className="text-lg font-mono font-bold text-[#26a17b]">{formatUSDT(apyUSDT)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Settings */}
        <Card>
          <CardHeader><CardTitle>Configurações USDT</CardTitle></CardHeader>
          <CardContent className="space-y-5 pt-4">
            {!isMay2025 && (
              <Input
                label="Receita mensal (USDT)"
                type="number"
                suffix="USDT"
                value={settings.monthlyAmount}
                onChange={(e) => updateUSDTSettings(currentMonthId, { monthlyAmount: parseFloat(e.target.value) || 0 })}
              />
            )}
            <div className="space-y-1">
              <Slider
                label="Converter para BRL"
                displayValue={`${settings.convertPercent}% = ${formatBRL(convertBRL)}`}
                min={0} max={100} step={5}
                value={settings.convertPercent}
                color="#00d4a0"
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  updateUSDTSettings(currentMonthId, { convertPercent: val, keepInApyPercent: 100 - val })
                }}
              />
            </div>
            <Slider
              label={`APY anual`}
              displayValue={`${settings.apyPercent}% a.a.`}
              min={1} max={30} step={0.5}
              value={settings.apyPercent}
              color="#6366f1"
              onChange={(e) => updateUSDTSettings(currentMonthId, { apyPercent: parseFloat(e.target.value) })}
            />
            <div className="flex items-center justify-between p-3 bg-[#07090d] rounded-xl border border-[#1a2030]">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-[#8898aa]">Converter</p>
                  <p className="text-sm font-mono text-[#00d4a0]">{formatUSDT(netAmount * (settings.convertPercent / 100))}</p>
                </div>
                <ArrowRight size={16} className="text-[#4a5568]" />
                <div>
                  <p className="text-xs text-[#8898aa]">APY estimado</p>
                  <p className="text-sm font-mono text-[#6366f1]">{formatUSDT(apyUSDT)}</p>
                </div>
              </div>
              <Badge variant="usdt">{settings.convertPercent}/{settings.keepInApyPercent}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Projections */}
        <Card>
          <CardHeader><CardTitle>Projeção APY ({settings.apyPercent}% a.a.)</CardTitle></CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {projections.map((p) => (
                <div key={p.months} className="p-3 bg-[#07090d] rounded-xl border border-[#1a2030] text-center">
                  <p className="text-xs text-[#8898aa] mb-1">{p.months} meses</p>
                  <p className="text-sm font-mono font-bold text-[#6366f1]">+{formatUSDT(p.gain)}</p>
                  <p className="text-xs text-[#4a5568] mt-0.5">{formatBRL(calcUSDTInBRL(p.gain, rate))}</p>
                </div>
              ))}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => v.toFixed(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="saldo" name="Saldo APY" stroke="#6366f1" fill="url(#apyGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="rendimento" name="Rendimento" stroke="#00d4a0" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Conversões</CardTitle>
            <Button size="sm" onClick={() => setShowConvForm(true)}><Plus size={14} /> Registrar</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {month.conversions.length === 0 && <p className="text-sm text-[#4a5568] py-6 text-center">Nenhuma conversão registrada</p>}
          {month.conversions.map((conv) => (
            <div key={conv.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#1a2030] hover:border-[#243048] transition-colors">
              <div>
                <p className="text-sm text-[#e8ecf4]">{conv.description || 'Conversão USDT → BRL'}</p>
                <p className="text-xs text-[#4a5568] mt-0.5">{new Date(conv.date).toLocaleDateString('pt-BR')} · taxa {conv.rate.toFixed(4)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-mono text-[#26a17b]">{formatUSDT(conv.usdtAmount)}</p>
                  <p className="text-xs font-mono text-[#00d4a0]">{formatBRL(conv.brlAmount)}</p>
                </div>
                <button onClick={() => deleteConversion(currentMonthId, conv.id)} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] cursor-pointer transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showConvForm} onClose={() => setShowConvForm(false)} title="Registrar Conversão" size="sm">
        <div className="space-y-4">
          <Input label="Quantidade USDT" type="number" suffix="USDT" value={convForm.usdtAmount}
            onChange={(e) => setConvForm({ ...convForm, usdtAmount: e.target.value })} placeholder="0.00" />
          {convForm.usdtAmount && (
            <div className="p-3 bg-[#07090d] rounded-xl border border-[#1a2030]">
              <p className="text-xs text-[#8898aa]">Valor em BRL (taxa {rate.toFixed(4)})</p>
              <p className="text-lg font-mono text-[#00d4a0]">{formatBRL(parseFloat(convForm.usdtAmount || '0') * rate)}</p>
            </div>
          )}
          <Input label="Descrição" value={convForm.description}
            onChange={(e) => setConvForm({ ...convForm, description: e.target.value })} placeholder="Opcional" />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowConvForm(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleConvert} disabled={!convForm.usdtAmount}>Registrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
