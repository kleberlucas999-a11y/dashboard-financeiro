'use client'
import { useEffect, useRef } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'

const DEBOUNCE_MS = 800

/**
 * Monitors Zustand store changes and auto-saves to Supabase (debounced).
 * Also exposes syncStatus from the store for UI indicators.
 */
export function useSupabaseSync() {
  const store = useFinanceStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountRef = useRef(true)

  useEffect(() => {
    // Skip the very first render (initial hydration)
    if (isMountRef.current) {
      isMountRef.current = false
      return
    }

    if (!store.userId) return

    // Debounce: reset timer on every store change
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      store.syncToSupabase()
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    store.months,
    store.userProfile,
    store.currentMonthId,
    store.exchangeRate,
  ])

  return store.syncStatus
}
