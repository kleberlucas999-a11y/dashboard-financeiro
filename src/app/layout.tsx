import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinDash — Dashboard Financeiro Pessoal',
  description: 'Gestão de fluxo financeiro mensal com renda fixa e USDT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#07090d] text-[#e8ecf4] antialiased">{children}</body>
    </html>
  )
}
