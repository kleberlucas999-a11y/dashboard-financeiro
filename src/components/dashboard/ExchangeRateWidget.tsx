'use client'
import { useEffect, useRef } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { fetchExchangeRate } from '@/lib/api'

export function ExchangeRatePoller() {
  const { exchangeRate, setExchangeRate } = useFinanceStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    if (exchangeRate.isManual) return
    try {
      const { rate, timestamp } = await fetchExchangeRate()
      setExchangeRate(rate, false)
    } catch {}
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 15 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return null
}
