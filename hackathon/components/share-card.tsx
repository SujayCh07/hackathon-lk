"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MapPin, DollarSign, Plane } from "lucide-react"

interface ShareCardProps {
  template: string
  userData: {
    name: string
    currentCity: string
    pppScore: number
    monthlyBudget: number
    bestCity: string
    savings: number
    totalSavings: number
  }
  compareCity: string
}

export function ShareCard({ template, userData, compareCity }: ShareCardProps) {
  const getCityFlag = (city: string) => {
    const flags: Record<string, string> = {
      "Bangkok, Thailand": "🇹🇭",
      "Mexico City, Mexico": "🇲🇽",
      "Prague, Czech Republic": "🇨🇿",
      "London, UK": "🇬🇧",
      "Zurich, Switzerland": "🇨🇭",
    }
    return flags[city] || "🌍"
  }

  const getSavingsForCity = (city: string) => {
    const savings: Record<string, number> = {
      "Bangkok, Thailand": 68,
      "Mexico City, Mexico": 45,
      "Prague, Czech Republic": 38,
      "London, UK": -15,
      "Zurich, Switzerland": -45,
    }
    return savings[city] || 0
  }

  const renderPPPScoreCard = () => (
    <Card className="w-80 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PP</span>
          </div>
          <span className="font-bold text-lg">PPP Pocket</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold">My PPP Score</h3>
          <div className="text-4xl font-bold text-primary">{userData.pppScore}/100</div>
          <Progress value={userData.pppScore} className="w-full" />
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{userData.currentCity}</span>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            See where your money goes the farthest with PPP-adjusted insights
          </p>
        </div>
      </CardContent>
    </Card>
  )

  const renderBudgetComparisonCard = () => {
    const savings = getSavingsForCity(compareCity)
    const adjustedBudget = userData.monthlyBudget * (1 + savings / 100)

    return (
      <Card className="w-80 bg-gradient-to-br from-accent/5 to-primary/5 border-2">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">PP</span>
            </div>
            <span className="font-bold text-lg">PPP Pocket</span>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold">Budget Comparison</h3>
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <span>{getCityFlag(userData.currentCity)}</span>
              <span>{userData.currentCity}</span>
              <span>→</span>
              <span>{getCityFlag(compareCity)}</span>
              <span>{compareCity}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Your Budget</p>
              <p className="text-lg font-bold">${userData.monthlyBudget.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Equivalent Value</p>
              <p className="text-lg font-bold text-primary">${Math.abs(adjustedBudget).toLocaleString()}</p>
            </div>
          </div>

          {savings > 0 && (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+{savings}%</div>
              <p className="text-xs text-green-700">More purchasing power</p>
            </div>
          )}

          <div className="pt-2 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">Powered by PPP insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCitySavingsCard = () => {
    const savings = getSavingsForCity(compareCity)

    return (
      <Card className="w-80 bg-gradient-to-br from-green-50 to-blue-50 border-2">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">PP</span>
            </div>
            <span className="font-bold text-lg">PPP Pocket</span>
          </div>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Smart Travel Savings</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-2xl">
                <span>{getCityFlag(compareCity)}</span>
                <span className="font-bold">{compareCity.split(",")[0]}</span>
              </div>

              {savings > 0 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">+{savings}%</div>
                  <p className="text-sm text-green-700">Your money goes further</p>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span>Save ${((userData.monthlyBudget * savings) / 100).toLocaleString()}/month</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-red-600">{savings}%</div>
                  <p className="text-sm text-red-700">Higher cost of living</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">Discover your purchasing power with PPP Pocket</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCard = () => {
    switch (template) {
      case "budget-comparison":
        return renderBudgetComparisonCard()
      case "city-savings":
        return renderCitySavingsCard()
      default:
        return renderPPPScoreCard()
    }
  }

  return <div className="flex justify-center">{renderCard()}</div>
}
