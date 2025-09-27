"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export interface PPPHighlight {
  code: string
  name: string
  flag: string | null
  ppp: number
  savingsRatio: number
  savingsPercent: number
  pppScore: number
}

interface UsePPPHighlightsOptions {
  baselinePPP?: number | null
  excludeCodes?: Array<string | null | undefined>
  limit?: number
}

interface UsePPPHighlightsResult {
  highlights: PPPHighlight[]
  loading: boolean
  error: Error | null
}

function clampScore(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 100
  }
  return Math.max(10, Math.min(200, Math.round(value)))
}

export function usePPPHighlights(options: UsePPPHighlightsOptions = {}): UsePPPHighlightsResult {
  const { baselinePPP, excludeCodes, limit = 12 } = options
  const [highlights, setHighlights] = useState<PPPHighlight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const exclusion = useMemo(() => {
    return new Set((excludeCodes ?? []).filter((code): code is string => typeof code === "string" && code.length > 0))
  }, [excludeCodes])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from("ppp_city")
          .select("code, name, flag, ppp")
          .not("ppp", "is", null)
          .gt("ppp", 0)
          .order("ppp", { ascending: true })
          .limit(limit)

        if (queryError) {
          throw queryError
        }

        const baseline = baselinePPP && baselinePPP > 0 ? baselinePPP : 1

        const processed = (data ?? [])
          .filter((city) => !exclusion.has(city.code ?? ""))
          .map((city) => {
            const pppValue = Number(city.ppp)
            const ratio = baseline > 0 ? (baseline - pppValue) / baseline : 0
            const score = baseline > 0 && pppValue > 0 ? (baseline / pppValue) * 100 : 100

            return {
              code: city.code ?? "",
              name: city.name ?? "",
              flag: city.flag ?? null,
              ppp: pppValue,
              savingsRatio: ratio,
              savingsPercent: Math.round(ratio * 100),
              pppScore: clampScore(score),
            }
          })
          .filter((item) => item.code && item.name && Number.isFinite(item.ppp) && item.ppp > 0)
          .sort((a, b) => b.savingsRatio - a.savingsRatio)
          .slice(0, limit)

        if (!cancelled) {
          setHighlights(processed)
        }
      } catch (caught) {
        if (cancelled) return
        const normalisedError =
          caught instanceof Error ? caught : new Error(typeof caught === "string" ? caught : "Failed to load PPP highlights")
        setError(normalisedError)
        setHighlights([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [baselinePPP, exclusion, limit])

  return { highlights, loading, error }
}

