"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export interface UserProfileCity {
  code: string | null
  name: string | null
  flag: string | null
  ppp: number | null
}

export interface UserProfileCountry {
  code: string | null
  name: string | null
}

export interface UserProfileData {
  name: string | null
  monthlyBudget: number | null
  currentCity: UserProfileCity | null
  homeCity: UserProfileCity | null
  currentCountry: UserProfileCountry | null
  homeCountry: UserProfileCountry | null
}

interface SupabaseProfileRow {
  name?: string | null
  monthly_budget?: number | string | null
  current_city?: {
    code?: string | null
    name?: string | null
    flag?: string | null
    ppp?: number | string | null
  } | null
  home_city?: {
    code?: string | null
    name?: string | null
    flag?: string | null
    ppp?: number | string | null
  } | null
  current_country?: {
    code?: string | null
    country?: string | null
  } | null
  home_country?: {
    code?: string | null
    country?: string | null
  } | null
}

function normaliseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function normaliseCity(city: SupabaseProfileRow["current_city"]): UserProfileCity | null {
  if (!city) return null

  return {
    code: city.code ?? null,
    name: city.name ?? null,
    flag: city.flag ?? null,
    ppp: normaliseNumber(city.ppp),
  }
}

function normaliseCountry(country: SupabaseProfileRow["current_country"]): UserProfileCountry | null {
  if (!country) return null

  return {
    code: country.code ?? null,
    name: country.country ?? null,
  }
}

function mapProfile(row: SupabaseProfileRow | null): UserProfileData | null {
  if (!row) return null

  return {
    name: row.name?.trim() || null,
    monthlyBudget: normaliseNumber(row.monthly_budget),
    currentCity: normaliseCity(row.current_city),
    homeCity: normaliseCity(row.home_city),
    currentCountry: normaliseCountry(row.current_country),
    homeCountry: normaliseCountry(row.home_country),
  }
}

export function useUserProfile(userId?: string | null) {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return null
    }

    const { data, error } = await supabase
      .from("user_profile")
      .select(
        `
        name,
        monthly_budget,
        current_city:ppp_city!user_profile_current_city_code_fkey(code, name, flag, ppp),
        home_city:ppp_city!user_profile_home_city_code_fkey(code, name, flag, ppp),
        current_country:country_ref!user_profile_current_country_fkey(code, country),
        home_country:country_ref!user_profile_home_country_fkey(code, country)
      `,
      )
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return mapProfile(data as SupabaseProfileRow | null)
  }, [userId])

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    loadProfile()
      .then((result) => {
        if (!cancelled) {
          setProfile(result)
        }
      })
      .catch((cause) => {
        if (cancelled) return
        const normalisedError =
          cause instanceof Error ? cause : new Error(typeof cause === "string" ? cause : "Failed to load profile")
        setError(normalisedError)
        setProfile(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, loadProfile])

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setError(null)
      return null
    }

    try {
      setLoading(true)
      setError(null)
      const result = await loadProfile()
      setProfile(result)
      return result
    } catch (cause) {
      const normalisedError =
        cause instanceof Error ? cause : new Error(typeof cause === "string" ? cause : "Failed to refresh profile")
      setError(normalisedError)
      setProfile(null)
      throw normalisedError
    } finally {
      setLoading(false)
    }
  }, [loadProfile, userId])

  return { profile, loading, error, refresh }
}
