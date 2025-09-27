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

const mockPPPData = {
  currentCity: "New York, NY",
  pppScore: 85,
  topCities: [
    { name: "Bangkok, Thailand", savings: 68, pppScore: 92 },
    { name: "Mexico City, Mexico", savings: 45, pppScore: 88 },
    { name: "Prague, Czech Republic", savings: 38, pppScore: 86 },
  ],
}

export default function Dashboard() {
  const { user, loading, nessie, syncingNessie } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent("/dashboard")}`)
    }
  }, [loading, user, router])

  const primaryAccount = useMemo(() => (nessie.accounts.length > 0 ? nessie.accounts[0] : null), [nessie.accounts])

  const transactions = useMemo(() => nessie.transactions.slice(0, 5), [nessie.transactions])

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
            <p className="text-muted-foreground">Your financial overview and PPP insights</p>
          </div>
          {primaryAccount?.currencyCode && (
            <Badge variant="secondary">{primaryAccount.currencyCode}</Badge>
          )}
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
                        $
                        {(primaryAccount?.balance ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {primaryAccount?.type ?? "Checking"} · {primaryAccount?.mask ?? "••••"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <TrendingUp className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly PPP Gain</p>
                      <p className="text-2xl font-semibold tracking-tight">+$642.30</p>
                      <p className="text-xs text-muted-foreground">vs. last month</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">Budget Allocation</p>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>Essentials</span>
                        <span className="text-muted-foreground">$2,800 / $3,500</span>
                      </div>
                      <Progress value={80} className="h-2 rounded-full" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>Experiences</span>
                        <span className="text-muted-foreground">$1,200 / $1,600</span>
                      </div>
                      <Progress value={75} className="h-2 rounded-full" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>Savings</span>
                        <span className="text-muted-foreground">$800 / $1,200</span>
                      </div>
                      <Progress value={66} className="h-2 rounded-full" />
                    </div>
                  </div>
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
                        ${transaction.amount.toFixed(2)}
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
                <div className="text-lg font-semibold">{mockPPPData.currentCity}</div>
                <p className="text-sm text-muted-foreground">Your purchasing power baseline</p>
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
            {mockPPPData.topCities.map((city, index) => (
              <Card key={city.name} className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-500">+{city.savings}%</span>
                    </div>
                  </div>
                  <h3 className="mb-1 text-sm font-semibold">{city.name}</h3>
                  <p className="mb-3 text-xs text-muted-foreground">PPP Score: {city.pppScore}/100</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <DollarSign className="mr-1 h-3 w-3" />
                    <span>Your money goes {city.savings}% further</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
