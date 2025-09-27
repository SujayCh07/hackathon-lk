'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { ensureNessieCustomer, fetchNessieOverview, type NessieAccount, type NessieTransaction } from '@/lib/nessie'
import { fetchUserProfileName, upsertUserProfileName, upsertUserRow } from '@/lib/user-identity'

interface NessieState {
  customerId: string | null
  accounts: NessieAccount[]
  transactions: NessieTransaction[]
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  authError: Error | null
  signIn(email: string, password: string): Promise<void>
  signUp(params: { email: string; password: string; displayName: string }): Promise<'session' | 'confirmation'>
  signOut(): Promise<void>
  nessie: NessieState
  syncingNessie: boolean
  refreshNessie(): Promise<void> | undefined
  refreshUser(): Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const initialNessieState: NessieState = {
  customerId: null,
  accounts: [],
  transactions: [],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<Error | null>(null)
  const [nessie, setNessie] = useState<NessieState>(initialNessieState)
  const [syncingNessie, setSyncingNessie] = useState(false)

  useEffect(() => {
    const initialise = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        setSession(data.session ?? null)
        setUser(data.session?.user ?? null)

        if (data.session?.user) {
          await syncNessie(data.session.user)
        }
      } catch (error) {
        setAuthError(error as Error)
      } finally {
        setLoading(false)
      }
    }

    initialise()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setAuthError(null)
      if (nextSession?.user) {
        await syncNessie(nextSession.user)
      } else {
        setNessie(initialNessieState)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureIdentity = useCallback(async (authUser: User) => {
    await upsertUserRow({ id: authUser.id, email: authUser.email ?? null })

    const metadataName = (authUser.user_metadata?.displayName as string | undefined)?.trim()
    const profileName = metadataName || (await fetchUserProfileName(authUser.id))
    const derivedName = profileName || authUser.email?.split('@')[0] || null

    if (derivedName) {
      await upsertUserProfileName({ userId: authUser.id, displayName: derivedName })
    }

    if (!metadataName && derivedName) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            ...(authUser.user_metadata ?? {}),
            displayName: derivedName,
          },
        })
        if (error) throw error
        if (data?.user) {
          setUser(data.user)
          return data.user
        }
      } catch (error) {
        console.warn('Failed to update display name metadata', error)
      }
    }

    return authUser
  }, [])

  const syncNessie = useCallback(
    async (authUser: User) => {
      setSyncingNessie(true)
      try {
        const identityUser = await ensureIdentity(authUser)
        const { customerId, user: refreshedUser } = await ensureNessieCustomer(identityUser)
        const effectiveUser = refreshedUser ?? identityUser
        if (effectiveUser) {
          setUser(effectiveUser)
        }

        const overview = await fetchNessieOverview(customerId)
        setNessie({
          customerId,
          accounts: normaliseAccounts(overview.accounts),
          transactions: normaliseTransactions(overview.transactions),
        })
      } catch (error) {
        console.error('Failed to synchronise Nessie data', error)
        setNessie(initialNessieState)
      } finally {
        setSyncingNessie(false)
      }
    },
    [ensureIdentity],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
  }, [])

  const signUp = useCallback(
    async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { displayName: displayName.trim() },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        await upsertUserRow({ id: data.user.id, email: data.user.email ?? email })
        await upsertUserProfileName({ userId: data.user.id, displayName })
      }

      return data.session ? 'session' : 'confirmation'
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setNessie(initialNessieState)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      setUser(data?.user ?? null)
      return data?.user ?? null
    } catch (error) {
      console.warn('Failed to refresh authenticated user', error)
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      nessie,
      syncingNessie,
      refreshNessie: () => (user ? syncNessie(user) : undefined),
      refreshUser,
    }),
    [
      authError,
      loading,
      nessie,
      refreshUser,
      session,
      signIn,
      signOut,
      signUp,
      syncNessie,
      syncingNessie,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function normaliseAccounts(accounts: unknown[]): NessieAccount[] {
  if (!Array.isArray(accounts)) return []

  return accounts.map((account) => {
    const record = account as Record<string, unknown>
    return {
      id: String(record._id ?? record.id ?? randomId('account')),
      name:
        typeof record.nickname === 'string' && record.nickname.trim().length > 0
          ? record.nickname
          : typeof record.name === 'string' && record.name.trim().length > 0
            ? record.name
            : 'Account',
      balance: Number(record.balance ?? record.balanceUSD ?? 0),
      currencyCode: String(record.currency ?? record.currency_code ?? 'USD'),
      type: String(record.type ?? 'checking'),
      mask: String(record.account_number_masked ?? record.account_number ?? '••••'),
    }
  })
}

function normaliseTransactions(transactions: unknown[]): NessieTransaction[] {
  if (!Array.isArray(transactions)) return []

  return transactions.map((transaction) => {
    const record = transaction as Record<string, unknown>
    const amount = Number(record.amount ?? record.purchase_amount ?? 0)
    const categories = record.category
    return {
      id: String(record._id ?? record.id ?? randomId('transaction')),
      merchant:
        typeof record.payee === 'string' && record.payee.trim()
          ? record.payee
          : typeof record.merchant === 'string' && record.merchant.trim()
            ? record.merchant
            : typeof record.description === 'string' && record.description.trim()
              ? record.description
              : 'Merchant',
      amount: Math.abs(amount),
      date:
        typeof record.transaction_date === 'string'
          ? record.transaction_date
          : typeof record.date === 'string'
            ? record.date
            : new Date().toISOString(),
      category: Array.isArray(categories) && categories.length > 0
        ? String(categories[0])
        : typeof record.category === 'string' && record.category.trim()
          ? record.category
          : typeof record.type === 'string' && record.type.trim()
            ? record.type
      : 'General',
      raw: record,
    }
  })
}

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`
}
