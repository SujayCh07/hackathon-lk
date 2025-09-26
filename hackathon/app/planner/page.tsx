"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, DollarSign } from "lucide-react"

// Mock PPP data for different cities
const cityData = [
  { name: "Bangkok, Thailand", costMultiplier: 0.32, flag: "🇹🇭" },
  { name: "Mexico City, Mexico", costMultiplier: 0.55, flag: "🇲🇽" },
  { name: "Prague, Czech Republic", costMultiplier: 0.62, flag: "🇨🇿" },
  { name: "New York, NY (Home)", costMultiplier: 1.0, flag: "🇺🇸" },
  { name: "London, UK", costMultiplier: 1.15, flag: "🇬🇧" },
  { name: "Zurich, Switzerland", costMultiplier: 1.45, flag: "🇨🇭" },
]

export default function GeoBudgetPlanner() {
  const [monthlyBudget, setMonthlyBudget] = useState([3000])

  const calculateMonthsInCity = (budget: number, costMultiplier: number) => {
    const adjustedMonthlyCost = budget * costMultiplier
    const monthsAvailable = budget / adjustedMonthlyCost
    return Math.round(monthsAvailable * 10) / 10
  }

  const getProgressColor = (months: number) => {
    if (months >= 2) return "bg-green-500"
    if (months >= 1.5) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 mx-auto max-w-screen-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">GeoBudget Planner</h1>
          <p className="text-muted-foreground">See how far your budget goes in different cities</p>
        </div>

        {/* Budget Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Monthly Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">Set your monthly budget</label>
                <Badge variant="secondary" className="text-lg font-bold">
                  ${monthlyBudget[0].toLocaleString()}
                </Badge>
              </div>
              <Slider
                value={monthlyBudget}
                onValueChange={setMonthlyBudget}
                max={10000}
                min={500}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>$500</span>
                <span>$10,000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* City Comparison Results */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Budget Duration by City</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cityData.map((city) => {
              const months = calculateMonthsInCity(monthlyBudget[0], city.costMultiplier)
              const progressValue = Math.min((months / 3) * 100, 100) // Scale to 3 months max for progress bar

              return (
                <Card key={city.name} className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{city.flag}</span>
                        <div>
                          <h3 className="font-semibold text-sm">{city.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Cost:{" "}
                            {city.costMultiplier === 1
                              ? "Baseline"
                              : `${(city.costMultiplier * 100).toFixed(0)}% of home`}
                          </p>
                        </div>
                      </div>
                      {city.costMultiplier < 1 && (
                        <Badge variant="secondary" className="text-green-600">
                          Savings
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Budget Duration</span>
                        <span className="text-2xl font-bold">
                          {months.toFixed(1)} {months === 1 ? "month" : "months"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Duration</span>
                          <span>{months >= 3 ? "3+ months" : `${months.toFixed(1)} months`}</span>
                        </div>
                        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getProgressColor(months)}`}
                            style={{ width: `${Math.min(progressValue, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Monthly cost</span>
                          </div>
                          <span className="font-medium">
                            ${(monthlyBudget[0] * city.costMultiplier).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Summary Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Budget Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {cityData.filter((city) => calculateMonthsInCity(monthlyBudget[0], city.costMultiplier) > 1).length}
                </div>
                <p className="text-sm text-muted-foreground">Cities with 1+ month budget</p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {Math.max(
                    ...cityData.map((city) => calculateMonthsInCity(monthlyBudget[0], city.costMultiplier)),
                  ).toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground">Max months in best city</p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  $
                  {((1 - Math.min(...cityData.map((city) => city.costMultiplier))) * monthlyBudget[0]).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Max potential savings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
