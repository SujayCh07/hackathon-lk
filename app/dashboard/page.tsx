"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapContainer } from "@/components/map-container"
import { CreditCard, TrendingUp, MapPin, DollarSign } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useUserProfile } from "@/hooks/use-user-profile"
import { usePPPHighlights } from "@/hooks/use-ppp-highlights"
import type { NessieTransaction } from "@/lib/nessie"

const essentialKeywords = [
  /rent/i,
  /mortgage/i,
  /loan/i,
  /market/i,
  /grocery/i,
  /supermart/i,
  /utility/i,
  /electric/i,
  /power/i,
  /water/i,
  /gas/i,
  /insurance/i,
  /clinic/i,
  /pharmacy/i,
  /hospital/i,
  /transport/i,
  /uber/i,
  /lyft/i,
]

const experienceKeywords = [
  /cafe/i,
  /coffee/i,
  /restaurant/i,
  /dining/i,
  /bar/i,
  /travel/i,
  /hotel/i,
  /airlines/i,
  /flight/i,
  /cinema/i,
  /theater/i,
  /concert/i,
  /museum/i,
  /festival/i,
  /resort/i,
  /adventure/i,
]

function classifyTransaction(transaction: NessieTransaction) {
  const descriptor = `${transaction.category ?? ""} ${transaction.merchant ?? ""}`.toLowerCase()
  if (essentialKeywords.some((pattern) => pattern.test(descriptor))) {
    return "essentials" as const
  }
  if (experienceKeywords.some((pattern) => pattern.test(descriptor))) {
    return "experiences" as const
  }
  return "other" as const
}

function calculateBudgetBuckets(transactions: NessieTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      const bucket = classifyTransaction(transaction)
      const amount = Math.abs(transaction.amount ?? 0)
      totals[bucket] += amount
      totals.total += amount
      return totals
    },
    { essentials: 0, experiences: 0, other: 0, total: 0 },
  )
}

function clampPPPScore(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null
  }
  return Math.max(10, Math.min(200, Math.round(value)))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrencySigned(value: number) {
  const formatted = formatCurrency(Math.abs(value))
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPPPIndex(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null
  }
  return value.toFixed(2)
}

export default function Dashboard() {
  const { user, loading, nessie, syncingNessie } = useAuth()
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile(user?.id)

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent("/dashboard")}`)
    }
  }, [loading, user, router])

  const primaryAccount = useMemo(() => (nessie.accounts.length > 0 ? nessie.accounts[0] : null), [nessie.accounts])

  const transactions = useMemo(() => {
    return nessie.transactions
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [nessie.transactions])

  const profileBaselinePPP = useMemo(() => {
    const current = profile?.currentCity?.ppp
    const fallback = profile?.homeCity?.ppp
    const candidate = current && current > 0 ? current : fallback && fallback > 0 ? fallback : null
    return candidate && candidate > 0 ? candidate : null
  }, [profile])

  const { highlights: pppHighlights, loading: highlightsLoading } = usePPPHighlights({
    baselinePPP: profileBaselinePPP ?? undefined,
    excludeCodes: [profile?.currentCity?.code, profile?.homeCity?.code],
    limit: 12,
  })

  const topCities = useMemo(() => pppHighlights.slice(0, 3), [pppHighlights])
  const bestCity = topCities[0] ?? null

  const budgetBuckets = useMemo(() => calculateBudgetBuckets(nessie.transactions), [nessie.transactions])

  const monthlyBudget = profile?.monthlyBudget && profile.monthlyBudget > 0 ? profile.monthlyBudget : null
  const effectiveBudget = useMemo(() => {
    if (monthlyBudget && monthlyBudget > 0) {
      return monthlyBudget
    }
    if (budgetBuckets.total > 0) {
      return budgetBuckets.total
    }
    if (primaryAccount?.balance && primaryAccount.balance > 0) {
      return primaryAccount.balance
    }
    return 0
  }, [monthlyBudget, budgetBuckets.total, primaryAccount?.balance])

  const essentialsProgress = effectiveBudget > 0 ? Math.min(100, (budgetBuckets.essentials / effectiveBudget) * 100) : 0
  const experiencesProgress = effectiveBudget > 0 ? Math.min(100, (budgetBuckets.experiences / effectiveBudget) * 100) : 0
  const projectedSavings = Math.max(effectiveBudget - (budgetBuckets.essentials + budgetBuckets.experiences), 0)
  const savingsProgress = effectiveBudget > 0 ? Math.min(100, (projectedSavings / effectiveBudget) * 100) : 0

  const monthlyPppGain = bestCity && effectiveBudget > 0 ? effectiveBudget * bestCity.savingsRatio : null

  const currentPPPScore = useMemo(() => {
    const homePPP = profile?.homeCity?.ppp && profile.homeCity.ppp > 0 ? profile.homeCity.ppp : profileBaselinePPP
    const currentPPP = profile?.currentCity?.ppp && profile.currentCity.ppp > 0 ? profile.currentCity.ppp : profileBaselinePPP
    if (!homePPP || !currentPPP) {
      return null
    }
    return clampPPPScore((homePPP / currentPPP) * 100)
  }, [profile?.homeCity?.ppp, profile?.currentCity?.ppp, profileBaselinePPP])

  const currentLocationLabel =
    profile?.currentCity?.name ?? profile?.currentCountry?.name ?? profile?.homeCity?.name ?? "Update your location in Settings"

  const currentCityPPPIndex = formatPPPIndex(
    profile?.currentCity?.ppp ?? profile?.homeCity?.ppp ?? profileBaselinePPP ?? null,
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          {loading ? "Checking your session…" : "Redirecting you to log in…"}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              {profileLoading ? "Loading your PPP profile…" : "Your financial overview and PPP insights"}
            </p>
          </div>
          {primaryAccount?.currencyCode && <Badge variant="secondary">{primaryAccount.currencyCode}</Badge>}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Spending Overview</span>
                  <Badge variant="secondary">PPP Adjusted</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Balance</p>
                      <p className="text-2xl font-semibold tracking-tight">
                        {formatCurrency(primaryAccount?.balance ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {primaryAccount?.type ?? "Checking"} · {primaryAccount?.mask ?? "••••"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                        <TrendingUp className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly PPP Gain</p>
                        <p className="text-2xl font-semibold tracking-tight">
                          {monthlyPppGain !== null ? formatCurrencySigned(monthlyPppGain) : "Set your budget"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {monthlyPppGain !== null && bestCity
                            ? bestCity.savingsRatio >= 0
                              ? `Living in ${bestCity.name} could save ${formatPercentage(bestCity.savingsRatio)} each month.`
                              : `${bestCity.name} is ${formatPercentage(Math.abs(bestCity.savingsRatio))} more expensive than your baseline.`
                            : "Add a monthly budget in Settings to see PPP savings opportunities."}
                        </p>
                      </div>
                    </div>
                    {currentPPPScore && (
                      <div className="rounded-lg bg-background/60 p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Current PPP score</span>
                          <span>{currentPPPScore}/200</span>
                        </div>
                        <Progress value={Math.min(100, currentPPPScore)} className="h-2 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">Budget Allocation</p>
                    <p className="text-xs text-muted-foreground">
                      Based on {monthlyBudget ? "your monthly budget" : budgetBuckets.total > 0 ? "recent transactions" : "account balance"}
                    </p>
                  </div>
                  {effectiveBudget > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span>Essentials</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(budgetBuckets.essentials)} / {formatCurrency(effectiveBudget)}
                          </span>
                        </div>
                        <Progress value={essentialsProgress} className="h-2 rounded-full" />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span>Experiences</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(budgetBuckets.experiences)} / {formatCurrency(effectiveBudget)}
                          </span>
                        </div>
                        <Progress value={experiencesProgress} className="h-2 rounded-full" />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span>Savings Potential</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(projectedSavings)} / {formatCurrency(effectiveBudget)}
                          </span>
                        </div>
                        <Progress value={savingsProgress} className="h-2 rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add transactions or set a monthly budget to unlock allocation insights.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {syncingNessie
                      ? "Syncing your latest purchases…"
                      : "No transactions found for this account yet."}
                  </p>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-xl bg-muted/30 p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{transaction.merchant}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-destructive">
                        -{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Current Location</span>
                  <MapPin className="h-5 w-5 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">{currentLocationLabel}</div>
                {currentPPPScore ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{currentPPPScore}</span>
                      <span className="text-sm text-muted-foreground">PPP score</span>
                    </div>
                    <Progress value={Math.min(100, currentPPPScore)} className="h-2 rounded-full" />
                    {currentCityPPPIndex && (
                      <p className="text-xs text-muted-foreground">
                        PPP index: {currentCityPPPIndex}× vs. US baseline
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Set your home and current cities in Settings to unlock PPP scoring.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle>PPP Score Map</CardTitle>
              </CardHeader>
              <CardContent>
                <MapContainer />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Top Cities for Your Money</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {highlightsLoading ? (
              <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm md:col-span-3">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Loading PPP highlights…</p>
                </CardContent>
              </Card>
            ) : topCities.length === 0 ? (
              <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm md:col-span-3">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Set your preferred cities in Settings to discover where your budget stretches the furthest.
                  </p>
                </CardContent>
              </Card>
            ) : (
              topCities.map((city, index) => (
                <Card key={city.code} className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-500">
                          {city.savingsRatio >= 0 ? `+${formatPercentage(city.savingsRatio)}` : formatPercentage(city.savingsRatio)}
                        </span>
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold">{city.name}</h3>
                    <p className="mb-3 text-xs text-muted-foreground">PPP Score: {city.pppScore}/200</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <DollarSign className="mr-1 h-3 w-3" />
                      <span>
                        {city.savingsRatio >= 0
                          ? `Your money goes ${formatPercentage(city.savingsRatio)} further`
                          : `${formatPercentage(Math.abs(city.savingsRatio))} higher cost than your baseline`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
