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

export interface UserProfileAddress {
  raw: string
  formatted: string
  houseNumber: string
  street: string
  city: string
  state: string
}

export interface UserProfileData {
  name: string | null
  monthlyBudget: number | null
  currentCity: UserProfileCity | null
  homeCity: UserProfileCity | null
  currentCountry: UserProfileCountry | null
  homeCountry: UserProfileCountry | null
  streetAddress: UserProfileAddress
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
  street_address?: string | null
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

const EMPTY_ADDRESS: UserProfileAddress = {
  raw: "",
  formatted: "",
  houseNumber: "",
  street: "",
  city: "",
  state: "",
}

function buildAddressString(parts: Partial<UserProfileAddress>) {
  const lineOne = [parts.houseNumber, parts.street]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
    .join(" ")
    .trim()

  const lineTwo = [parts.city, parts.state]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
    .join(", ")
    .trim()

  return [lineOne, lineTwo].filter((line) => line.length > 0).join("\n")
}

function normaliseStreetAddress(value: SupabaseProfileRow["street_address"]): UserProfileAddress {
  if (!value) return { ...EMPTY_ADDRESS }

  let rawValue = value
  if (typeof rawValue !== "string") {
    rawValue = String(rawValue)
  }

  const cleaned = rawValue.replace(/\r/g, "").trim()
  if (!cleaned) return { ...EMPTY_ADDRESS }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    if (parsed && typeof parsed === "object") {
      const parts = {
        houseNumber: typeof parsed.houseNumber === "string" ? parsed.houseNumber.trim() : "",
        street: typeof parsed.street === "string" ? parsed.street.trim() : "",
        city: typeof parsed.city === "string" ? parsed.city.trim() : "",
        state:
          typeof parsed.state === "string"
            ? parsed.state.trim().toUpperCase()
            : "",
      }

      const formatted =
        typeof parsed.formatted === "string" && parsed.formatted.trim().length > 0
          ? parsed.formatted.trim()
          : buildAddressString(parts)
      return {
        raw: cleaned,
        formatted,
        ...parts,
      }
    }
  } catch (error) {
    // Ignore JSON parsing errors and fall back to heuristic parsing
  }

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let lineOne = lines[0] ?? ""
  let remainder = lines.slice(1).join(", ")

  if (!remainder && lineOne.includes(",")) {
    const [first, ...rest] = lineOne
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
    lineOne = first ?? ""
    remainder = rest.join(", ")
  }

  const parts = { ...EMPTY_ADDRESS }

  const numberMatch = lineOne.match(/^(?<number>[\dA-Za-z-]+)\s+(?<street>.*)$/)
  if (numberMatch?.groups) {
    parts.houseNumber = numberMatch.groups.number?.trim() ?? ""
    parts.street = numberMatch.groups.street?.trim() ?? ""
  } else {
    parts.street = lineOne.trim()
  }

  const locality = remainder || lines[1] || ""
  const localityParts = locality
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  if (localityParts.length === 1) {
    if (localityParts[0].length <= 3) {
      parts.state = localityParts[0].toUpperCase()
    } else {
      parts.city = localityParts[0]
    }
  } else if (localityParts.length > 1) {
    parts.city = localityParts[0]
    parts.state = localityParts[1]?.toUpperCase() ?? ""
  }

  const formatted = buildAddressString(parts)

  return {
    raw: cleaned,
    formatted,
    ...parts,
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
    streetAddress: normaliseStreetAddress(row.street_address),
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
        street_address,
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
