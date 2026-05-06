'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, Mail, Lock, Eye, EyeOff, Globe, Loader2, AlertCircle } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.')
      else if (msg.includes('User already registered')) setError('Este e-mail já está cadastrado. Faça login.')
      else if (msg.includes('Password should be at least')) setError('A senha deve ter pelo menos 6 caracteres.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center">
            <TrendingUp size={20} className="text-[#00d4a0]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#e8ecf4] leading-none">FinDash</p>
            <p className="text-xs text-[#4a5568] mt-0.5">Dashboard Financeiro Pessoal</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0d1117] border border-[#1a2030] rounded-2xl p-8 shadow-2xl">

          {/* Tabs */}
          <div className="flex rounded-xl bg-[#07090d] border border-[#1a2030] p-1 mb-6">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccessMsg('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-[#00d4a0]/15 text-[#00d4a0] border border-[#00d4a0]/30'
                    : 'text-[#4a5568] hover:text-[#8898aa]'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-[#8898aa] mb-1.5 font-medium">E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-[#07090d] border border-[#1a2030] rounded-xl pl-9 pr-4 py-3 text-sm text-[#e8ecf4] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4a0]/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-[#8898aa] mb-1.5 font-medium">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  className="w-full bg-[#07090d] border border-[#1a2030] rounded-xl pl-9 pr-10 py-3 text-sm text-[#e8ecf4] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4a0]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#8898aa] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#f06060]/10 border border-[#f06060]/30 text-sm text-[#f06060]">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="px-3 py-2.5 rounded-xl bg-[#00d4a0]/10 border border-[#00d4a0]/30 text-sm text-[#00d4a0]">
                {successMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-[#00d4a0] text-[#07090d] text-sm font-bold hover:bg-[#00d4a0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#1a2030]" />
            <span className="text-xs text-[#4a5568]">ou</span>
            <div className="flex-1 h-px bg-[#1a2030]" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full py-3 rounded-xl border border-[#1a2030] bg-[#07090d] text-[#e8ecf4] text-sm font-medium hover:border-[#243048] hover:bg-[#0d1117] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {googleLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <Globe size={16} className="text-[#8898aa]" />
            }
            Entrar com Google
          </button>

          {/* Footer note */}
          <p className="text-xs text-[#4a5568] text-center mt-5">
            Seus dados ficam salvos na nuvem e acessíveis em qualquer dispositivo.
          </p>
        </div>
      </div>
    </div>
  )
}
