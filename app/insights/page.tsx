"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ShoppingCart, Home, Car, Coffee, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

// Mock spending categories data
const spendingCategories = [
  {
    id: "groceries",
    name: "Groceries",
    icon: ShoppingCart,
    homeSpend: 450,
    color: "bg-green-500",
  },
  {
    id: "rent",
    name: "Rent",
    icon: Home,
    homeSpend: 2200,
    color: "bg-blue-500",
  },
  {
    id: "transport",
    name: "Transportation",
    icon: Car,
    homeSpend: 320,
    color: "bg-purple-500",
  },
  {
    id: "dining",
    name: "Food & Dining",
    icon: Coffee,
    homeSpend: 280,
    color: "bg-orange-500",
  },
]

// Mock city comparison data
const cityComparisons = [
  { name: "Bangkok, Thailand", multiplier: 0.32, flag: "🇹🇭" },
  { name: "Mexico City, Mexico", multiplier: 0.55, flag: "🇲🇽" },
  { name: "Prague, Czech Republic", multiplier: 0.62, flag: "🇨🇿" },
  { name: "London, UK", multiplier: 1.15, flag: "🇬🇧" },
  { name: "Zurich, Switzerland", multiplier: 1.45, flag: "🇨🇭" },
]

export default function SmartSpendInsights() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState("Bangkok, Thailand")
  const [homeCity] = useState("New York, NY")

  const selectedCityData = cityComparisons.find((city) => city.name === selectedCity)
  const multiplier = selectedCityData?.multiplier || 1

  const calculateEquivalent = (homeAmount: number, multiplier: number) => {
    return Math.round(homeAmount * multiplier)
  }

  const getSavingsPercentage = (multiplier: number) => {
    return Math.round((1 - multiplier) * 100)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent("/insights")}`)
    }
  }, [loading, user, router])

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

      <div className="container px-4 py-8 mx-auto max-w-screen-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Smart-Spend Insights</h1>
          <p className="text-muted-foreground">See how your spending translates across different cities</p>
        </div>

        {/* City Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Compare Your Spending Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your spending in</span>
                <Badge variant="outline">{homeCity}</Badge>
                <span className="text-sm font-medium">equals</span>
              </div>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cityComparisons.map((city) => (
                    <SelectItem key={city.name} value={city.name}>
                      <div className="flex items-center gap-2">
                        <span>{city.flag}</span>
                        <span>{city.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {multiplier < 1 && (
                <Badge variant="secondary" className="text-green-600">
                  {getSavingsPercentage(multiplier)}% savings
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Comparison Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {spendingCategories.map((category) => {
            const Icon = category.icon
            const equivalentAmount = calculateEquivalent(category.homeSpend, multiplier)
            const savings = category.homeSpend - equivalentAmount

            return (
              <Card key={category.id} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${category.color}/10`}>
                      <Icon className={`h-5 w-5 text-white`} style={{ color: category.color.replace("bg-", "") }} />
                    </div>
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">In {homeCity}</span>
                      <span className="font-bold">${category.homeSpend}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">In {selectedCity}</span>
                      <span className="font-bold text-primary">${equivalentAmount}</span>
                    </div>

                    {savings > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3" />
                          Savings
                        </span>
                        <span className="font-bold text-green-600">${savings}</span>
                      </div>
                    )}

                    {savings < 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-sm text-red-600 flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          Extra cost
                        </span>
                        <span className="font-bold text-red-600">${Math.abs(savings)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Spending Comparison Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Interactive Bar Chart</p>
                  <p className="text-xs text-muted-foreground">Chart.js integration placeholder</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Savings Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spendingCategories.map((category) => {
                  const equivalentAmount = calculateEquivalent(category.homeSpend, multiplier)
                  const savings = category.homeSpend - equivalentAmount
                  const savingsPercentage = ((savings / category.homeSpend) * 100).toFixed(1)

                  return (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {savings >= 0 ? "+" : ""}${savings}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {savings >= 0 ? savingsPercentage : Math.abs(Number.parseFloat(savingsPercentage))}%
                          {savings >= 0 ? " saved" : " more"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  ${spendingCategories.reduce((sum, cat) => sum + cat.homeSpend, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total in {homeCity}</p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  $
                  {spendingCategories
                    .reduce((sum, cat) => sum + calculateEquivalent(cat.homeSpend, multiplier), 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total in {selectedCity}</p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className={`text-2xl font-bold ${multiplier < 1 ? "text-green-600" : "text-red-600"}`}>
                  {multiplier < 1 ? "+" : ""}$
                  {Math.abs(
                    spendingCategories.reduce((sum, cat) => sum + cat.homeSpend, 0) -
                      spendingCategories.reduce((sum, cat) => sum + calculateEquivalent(cat.homeSpend, multiplier), 0),
                  ).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {multiplier < 1 ? "Monthly savings" : "Extra monthly cost"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
