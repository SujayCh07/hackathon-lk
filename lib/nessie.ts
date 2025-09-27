import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { DEMO_NESSIE_CUSTOMER_ID, getFallbackNessieOverview } from '@/data/mock-nessie'
export { DEMO_NESSIE_CUSTOMER_ID, getFallbackNessieOverview } from '@/data/mock-nessie'

const baseUrl = process.env.NEXT_PUBLIC_NESSIE_BASE_URL ?? 'https://api.nessieisreal.com'
const apiKey = process.env.NEXT_PUBLIC_NESSIE_API_KEY
const nessieConfigured = Boolean(apiKey)

class NessieConfigurationError extends Error {
  constructor() {
    super('The Nessie API is not configured. Set NEXT_PUBLIC_NESSIE_API_KEY to enable live data.')
    this.name = 'NessieConfigurationError'
  }
}

function buildUrl(path: string, query: Record<string, string | number | undefined> = {}) {
  if (!path.startsWith('/')) {
    throw new Error('Nessie API paths must include a leading slash')
  }

  if (!nessieConfigured) {
    throw new NessieConfigurationError()
  }

  const url = new URL(path, baseUrl)
  url.searchParams.set('key', apiKey!)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

async function request<T>(path: string, init?: RequestInit & { query?: Record<string, string | number | undefined> }) {
  if (!nessieConfigured) {
    throw new NessieConfigurationError()
  }

  const { query, ...requestInit } = init ?? {}
  const response = await fetch(buildUrl(path, query), {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      ...(requestInit?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Nessie API error (${response.status}): ${message}`)
  }

  return (await response.json()) as T
}

export interface NessieAccount {
  id: string
  name: string
  balance: number
  currencyCode: string
  type: string
  mask: string
}

export interface NessieTransaction {
  id: string
  merchant: string
  amount: number
  date: string
  category: string
  raw: Record<string, unknown>
}

export async function ensureNessieCustomer(user: User) {
  const existingId = user.user_metadata?.nessieCustomerId as string | undefined
  if (existingId) {
    return { customerId: existingId, user }
  }

  const profile = {
    first_name: (user.user_metadata?.displayName as string) ?? user.email?.split('@')[0] ?? 'PPP',
    last_name: 'Explorer',
    address: {
      street_number: '1',
      street_name: 'Capital One Way',
      city: 'McLean',
      state: 'VA',
      zip: '22102',
    },
  }

  try {
    const customer = await request<{ _id?: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(profile),
    })

    if (!customer?._id) {
      throw new Error('Nessie customer creation did not return an id')
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata ?? {}),
        nessieCustomerId: customer._id,
      },
    })

    if (error) {
      throw error
    }

    return { customerId: customer._id, user: data?.user ?? user }
  } catch (error) {
    if (!(error instanceof NessieConfigurationError)) {
      console.warn('Falling back to demo Nessie customer', error)
    }
    return { customerId: DEMO_NESSIE_CUSTOMER_ID, user }
  }
}

export async function fetchNessieOverview(customerId: string) {
  if (!customerId || customerId === DEMO_NESSIE_CUSTOMER_ID || !nessieConfigured) {
    return getFallbackNessieOverview()
  }

  try {
    const [accounts, transactions] = await Promise.all([
      request<unknown[]>(`/customers/${customerId}/accounts`),
      request<unknown[]>(`/customers/${customerId}/transactions`),
    ])

    return {
      accounts: Array.isArray(accounts) ? accounts : [],
      transactions: Array.isArray(transactions) ? transactions : [],
    }
  } catch (error) {
    if (!(error instanceof NessieConfigurationError)) {
      console.warn('Failed to fetch Nessie data, using demo data instead', error)
    }
    return getFallbackNessieOverview()
  }
}
