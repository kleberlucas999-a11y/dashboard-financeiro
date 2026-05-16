'use client'
import { useState, useRef, useCallback } from 'react'
import { useFinanceStore, ImportRow } from '@/store/useFinanceStore'
import { DailyExpenseCategory } from '@/types'
import { formatBRL } from '@/lib/utils'
import { Upload, X, Download, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── CSV Parser ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES: DailyExpenseCategory[] = ['alimentacao','transporte','lazer','saude','servico','compras','outro']
const VALID_TIPOS = ['custo','lazer','investimento']
const VALID_CONTAS = ['operacional','usdt','cartao_credito']

function parseDate(raw: string): string | null {
  raw = raw.trim()
  // DD/MM/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    return `${y}-${m}-${d}`
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

interface ParsedRow {
  row: ImportRow
  valid: boolean
  errors: string[]
  original: string[]
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Skip header
  const dataLines = lines.slice(1)

  return dataLines.map((line) => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const [rawDate, descricao, rawValor, categoria, tipo, conta, rawStatus] = cols
    const errors: string[] = []

    const date = parseDate(rawDate ?? '')
    if (!date) errors.push('Data inválida (use DD/MM/AAAA)')

    const amount = parseFloat((rawValor ?? '').replace(',', '.'))
    if (isNaN(amount) || amount <= 0) errors.push('Valor inválido')

    if (!descricao?.trim()) errors.push('Descrição obrigatória')

    const cat = (categoria ?? '').toLowerCase() as DailyExpenseCategory
    if (!VALID_CATEGORIES.includes(cat)) errors.push(`Categoria inválida: "${categoria}" (use: alimentacao, transporte, lazer, saude, servico, compras, outro)`)

    const tip = (tipo ?? '').toLowerCase()
    if (!VALID_TIPOS.includes(tip)) errors.push(`Tipo inválido: "${tipo}"`)

    const cnt = (conta ?? '').toLowerCase()
    if (!VALID_CONTAS.includes(cnt)) errors.push(`Conta inválida: "${conta}"`)

    const status = ((rawStatus ?? 'pago').toLowerCase()) as 'pago' | 'pendente'

    const row: ImportRow = {
      date: date ?? '',
      description: descricao?.trim() ?? '',
      amount: isNaN(amount) ? 0 : amount,
      category: VALID_CATEGORIES.includes(cat) ? cat : 'outro',
      tipo: VALID_TIPOS.includes(tip) ? tip as ImportRow['tipo'] : 'custo',
      conta: VALID_CONTAS.includes(cnt) ? cnt as ImportRow['conta'] : 'operacional',
      status: status === 'pendente' ? 'pendente' : 'pago',
    }

    return { row, valid: errors.length === 0, errors, original: cols }
  }).filter(r => r.original.some(c => c.trim()))
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const CONTA_LABELS: Record<string, string> = {
  operacional: 'Operacional',
  usdt: 'USDT / APY',
  cartao_credito: '💳 Cartão',
}

const TIPO_COLORS: Record<string, string> = {
  custo: '#f06060',
  lazer: '#8b5cf6',
  investimento: '#00d4a0',
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'done'

export function ImportWidget({ onClose }: { onClose: () => void }) {
  const { currentMonthId, importExpenses, exchangeRate } = useFinanceStore()
  const rate = exchangeRate.rate
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo .csv')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const validRows = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)
  // Convert USDT rows to BRL for the total
  const totalAmount = validRows.reduce((s, r) => s + (r.row.conta === 'usdt' ? r.row.amount * rate : r.row.amount), 0)

  const handleConfirm = () => {
    importExpenses(currentMonthId, validRows.map(r => r.row))
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-[#1a2030] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2030] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-[#00d4a0]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#e8ecf4]">Importar Gastos</p>
              <p className="text-xs text-[#4a5568]">
                {step === 'upload' && 'Selecione o arquivo CSV'}
                {step === 'preview' && `${rows.length} linhas encontradas · ${validRows.length} válidas`}
                {step === 'done' && 'Importação concluída'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] cursor-pointer transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all',
                  dragging ? 'border-[#00d4a0] bg-[#00d4a0]/10' : 'border-[#1a2030] hover:border-[#243048] hover:bg-[#1a2030]/50'
                )}
              >
                <Upload size={32} className={dragging ? 'text-[#00d4a0]' : 'text-[#4a5568]'} />
                <div className="text-center">
                  <p className="text-sm font-medium text-[#e8ecf4]">Arraste o CSV ou clique para selecionar</p>
                  <p className="text-xs text-[#4a5568] mt-1">Apenas arquivos .csv</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {/* Download template */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#07090d] border border-[#1a2030]">
                <div>
                  <p className="text-sm font-medium text-[#e8ecf4]">Modelo de planilha</p>
                  <p className="text-xs text-[#4a5568] mt-0.5">Baixe, preencha e importe</p>
                </div>
                <a
                  href="/modelo-importacao.csv"
                  download="modelo-importacao.csv"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00d4a0]/15 border border-[#00d4a0]/30 text-[#00d4a0] text-sm font-medium hover:bg-[#00d4a0]/25 transition-all"
                  onClick={e => e.stopPropagation()}
                >
                  <Download size={15} />
                  Baixar modelo
                </a>
              </div>

              {/* Format guide */}
              <div className="p-4 rounded-xl bg-[#07090d] border border-[#1a2030] space-y-2">
                <p className="text-xs font-semibold text-[#8898aa] uppercase tracking-wider">Colunas esperadas</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { col: 'data', ex: '12/05/2025' },
                    { col: 'descricao', ex: 'Uber' },
                    { col: 'valor', ex: '45.00' },
                    { col: 'categoria', ex: 'alimentacao / transporte / lazer / saude / servico / compras / outro' },
                    { col: 'tipo', ex: 'custo / lazer / investimento' },
                    { col: 'conta', ex: 'operacional / usdt / cartao_credito' },
                    { col: 'status', ex: 'pago / pendente' },
                  ].map(({ col, ex }) => (
                    <div key={col} className="bg-[#0d1117] rounded-lg p-2 border border-[#1a2030]">
                      <p className="text-xs font-mono font-bold text-[#00d4a0]">{col}</p>
                      <p className="text-xs text-[#4a5568] mt-0.5 truncate">{ex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#07090d] border border-[#1a2030] text-center">
                  <p className="text-lg font-bold text-[#e8ecf4]">{rows.length}</p>
                  <p className="text-xs text-[#4a5568]">Total de linhas</p>
                </div>
                <div className="p-3 rounded-xl bg-[#00d4a0]/10 border border-[#00d4a0]/20 text-center">
                  <p className="text-lg font-bold text-[#00d4a0]">{validRows.length}</p>
                  <p className="text-xs text-[#4a5568]">Válidas</p>
                </div>
                <div className={cn('p-3 rounded-xl text-center', invalidRows.length > 0 ? 'bg-[#f06060]/10 border border-[#f06060]/20' : 'bg-[#07090d] border border-[#1a2030]')}>
                  <p className={cn('text-lg font-bold', invalidRows.length > 0 ? 'text-[#f06060]' : 'text-[#4a5568]')}>{invalidRows.length}</p>
                  <p className="text-xs text-[#4a5568]">Com erro</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
                <div>
                  <p className="text-sm text-[#8898aa]">Total a importar (em BRL)</p>
                  {validRows.some(r => r.row.conta === 'usdt') && (
                    <p className="text-xs text-[#26a17b] mt-0.5">
                      Inclui {validRows.filter(r => r.row.conta === 'usdt').reduce((s,r) => s + r.row.amount, 0).toFixed(2)} USDT × R${rate.toFixed(2)}
                    </p>
                  )}
                </div>
                <p className="text-base font-mono font-bold text-[#e8ecf4]">{formatBRL(totalAmount)}</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#1a2030]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#07090d] border-b border-[#1a2030]">
                      {['Data','Descrição','Valor','Categoria','Tipo','Conta','Status',''].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[#4a5568] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={cn(
                        'border-b border-[#1a2030] last:border-0',
                        r.valid ? 'hover:bg-[#1a2030]/30' : 'bg-[#f06060]/05'
                      )}>
                        <td className="px-3 py-2 text-[#8898aa] whitespace-nowrap font-mono">
                          {r.row.date ? r.row.date.split('-').reverse().join('/').slice(0,5) : '—'}
                        </td>
                        <td className="px-3 py-2 text-[#e8ecf4] max-w-[160px] truncate">{r.row.description || '—'}</td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {r.row.amount > 0 ? (
                            r.row.conta === 'usdt' ? (
                              <span className="flex flex-col">
                                <span className="text-[#26a17b] font-bold">{r.row.amount.toFixed(2)} USDT</span>
                                <span className="text-[#4a5568] text-[10px]">≈ {formatBRL(r.row.amount * rate)}</span>
                              </span>
                            ) : (
                              <span className="text-[#e8ecf4]">{formatBRL(r.row.amount)}</span>
                            )
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 text-[#8898aa]">{r.row.category}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                            background: `${TIPO_COLORS[r.row.tipo]}18`,
                            color: TIPO_COLORS[r.row.tipo],
                          }}>
                            {r.row.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#8898aa] whitespace-nowrap">{CONTA_LABELS[r.row.conta] ?? r.row.conta}</td>
                        <td className="px-3 py-2">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                            r.row.status === 'pago' ? 'bg-[#00d4a0]/15 text-[#00d4a0]' : 'bg-[#f5a020]/15 text-[#f5a020]'
                          )}>
                            {r.row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {!r.valid && (
                            <div className="group relative">
                              <AlertCircle size={14} className="text-[#f06060] cursor-help" />
                              <div className="absolute right-0 top-5 z-10 hidden group-hover:block bg-[#07090d] border border-[#f06060]/30 rounded-lg p-2 w-48 shadow-xl">
                                {r.errors.map((e, j) => <p key={j} className="text-[10px] text-[#f06060]">• {e}</p>)}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <p className="text-xs text-[#f5a020] flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {invalidRows.length} linha(s) com erro serão ignoradas. Passe o mouse no ícone para ver o problema.
                </p>
              )}
            </div>
          )}

          {/* ── STEP: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center">
                <CheckCircle size={32} className="text-[#00d4a0]" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#e8ecf4]">Importação concluída!</p>
                <p className="text-sm text-[#4a5568] mt-1">
                  {validRows.length} gastos importados · {formatBRL(totalAmount)} total
                </p>
              </div>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#00d4a0] text-[#07090d] font-semibold text-sm hover:bg-[#00bfa0] cursor-pointer transition-all">
                Ver nos Gastos Diários
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && validRows.length > 0 && (
          <div className="px-6 py-4 border-t border-[#1a2030] flex items-center justify-between shrink-0">
            <button
              onClick={() => { setStep('upload'); setRows([]) }}
              className="px-4 py-2 rounded-xl border border-[#1a2030] text-[#8898aa] hover:text-[#e8ecf4] hover:border-[#243048] text-sm cursor-pointer transition-all"
            >
              Trocar arquivo
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00d4a0] text-[#07090d] font-semibold text-sm hover:bg-[#00bfa0] cursor-pointer transition-all"
            >
              Importar {validRows.length} gastos
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
