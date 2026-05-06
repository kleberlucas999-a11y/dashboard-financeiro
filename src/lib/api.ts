export interface AwesomeAPIResponse {
  USDBRL: {
    code: string
    codein: string
    name: string
    high: string
    low: string
    varBid: string
    pctChange: string
    bid: string
    ask: string
    timestamp: string
    create_date: string
  }
}

export async function fetchExchangeRate(): Promise<{ rate: number; timestamp: string }> {
  const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
    next: { revalidate: 0 },
  })
  if (!response.ok) throw new Error('Failed to fetch exchange rate')
  const data: AwesomeAPIResponse = await response.json()
  return {
    rate: parseFloat(data.USDBRL.bid),
    timestamp: new Date().toISOString(),
  }
}
