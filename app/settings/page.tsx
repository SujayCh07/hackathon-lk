"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCityDirectory,
  fetchUserProfile,
  updateUserProfile,
  type CityDirectoryEntry,
} from "@/lib/user-identity"

interface FormState {
  displayName: string
  currentCityCode: string
  homeCityCode: string
  monthlyBudget: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading, refreshUser, nessie, syncingNessie, refreshNessie } = useAuth()
  const [formValues, setFormValues] = useState<FormState>({
    displayName: "",
    currentCityCode: "",
    homeCityCode: "",
    monthlyBudget: "",
  })
  const [initialValues, setInitialValues] = useState<FormState | null>(null)
  const [cities, setCities] = useState<CityDirectoryEntry[]>([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent("/settings")}`)
    }
  }, [loading, user, router])

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setFormValues({ displayName: "", currentCityCode: "", homeCityCode: "", monthlyBudget: "" })
      setInitialValues(null)
      return
    }

    setProfileLoading(true)
    setLoadError(null)
    setFeedback(null)

    try {
      const [profile, directory] = await Promise.all([
        fetchUserProfile(user.id),
        fetchCityDirectory(),
      ])

      setCities(directory)

      const baseDisplayName =
        profile?.name?.trim() ||
        user.user_metadata?.displayName?.trim() ||
        user.user_metadata?.name?.trim() ||
        user.email?.split("@")[0] ||
        ""

      const nextValues: FormState = {
        displayName: baseDisplayName,
        currentCityCode: profile?.current_city_code ?? "",
        homeCityCode: profile?.home_city_code ?? "",
        monthlyBudget:
          typeof profile?.monthly_budget === "number" && !Number.isNaN(profile.monthly_budget)
            ? String(profile.monthly_budget)
            : "",
      }

      setFormValues(nextValues)
      setInitialValues(nextValues)
    } catch (error) {
      console.warn("Failed to load profile", error)
      setLoadError(error instanceof Error ? error.message : "Unable to load your profile right now.")
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const cityOptions = useMemo(() => {
    return cities.map((city) => ({
      code: city.code,
      label: city.flag ? `${city.flag} ${city.name}` : city.name,
    }))
  }, [cities])

  const isDirty = useMemo(() => {
    if (!initialValues) return false
    return (
      initialValues.displayName !== formValues.displayName.trim() ||
      initialValues.currentCityCode !== formValues.currentCityCode ||
      initialValues.homeCityCode !== formValues.homeCityCode ||
      initialValues.monthlyBudget !== formValues.monthlyBudget.trim()
    )
  }, [formValues, initialValues])

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setFormValues((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (!user?.id) {
      setFeedback({ type: "error", text: "You need to be signed in to update your profile." })
      return
    }

    const trimmedDisplayName = formValues.displayName.trim()
    if (!trimmedDisplayName) {
      setFeedback({ type: "error", text: "Display name is required." })
      return
    }

    const trimmedBudget = formValues.monthlyBudget.trim()
    const monthlyBudgetValue = trimmedBudget === "" ? null : Number(trimmedBudget)
    if (monthlyBudgetValue !== null && Number.isNaN(monthlyBudgetValue)) {
      setFeedback({ type: "error", text: "Monthly budget must be a valid number." })
      return
    }

    setSaving(true)

    try {
      await updateUserProfile({
        userId: user.id,
        displayName: trimmedDisplayName,
        currentCityCode: formValues.currentCityCode || null,
        homeCityCode: formValues.homeCityCode || null,
        monthlyBudget: monthlyBudgetValue ?? undefined,
      })

      try {
        await refreshUser()
      } catch (error) {
        console.warn("Failed to refresh auth user", error)
      }

      const normalisedBudget =
        monthlyBudgetValue === null || Number.isNaN(monthlyBudgetValue)
          ? ""
          : String(monthlyBudgetValue)

      const nextValues: FormState = {
        displayName: trimmedDisplayName,
        currentCityCode: formValues.currentCityCode,
        homeCityCode: formValues.homeCityCode,
        monthlyBudget: normalisedBudget,
      }

      setFormValues(nextValues)
      setInitialValues(nextValues)
      setFeedback({ type: "success", text: "Profile updated successfully." })
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save your profile.",
      })
    } finally {
      setSaving(false)
    }
  }

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
      <main className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Account settings</h1>
          <p className="text-muted-foreground">
            Manage the details we store in Supabase and tailor your Nessie integration.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
              feedback.type === "success"
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border-0 bg-card/95 shadow-xl">
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                  Loading your profile…
                </div>
              ) : loadError ? (
                <div className="space-y-4">
                  <p className="text-sm text-destructive">{loadError}</p>
                  <Button variant="secondary" onClick={loadProfile} className="text-sm">
                    Try again
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-2">
                      <label htmlFor="settings-display-name" className="text-sm font-medium">
                        Display name
                      </label>
                      <Input
                        id="settings-display-name"
                        name="displayName"
                        value={formValues.displayName}
                        onChange={handleInputChange}
                        required
                        placeholder="How should we greet you?"
                      />
                      <p className="text-xs text-muted-foreground">
                        This name appears in the navigation bar and across personalised insights.
                      </p>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label htmlFor="settings-email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input id="settings-email" type="email" value={user.email ?? ""} disabled />
                      <p className="text-xs text-muted-foreground">
                        Managed via Supabase Auth. Contact support to update this address.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="settings-current-city" className="text-sm font-medium">
                        Current city
                      </label>
                      <select
                        id="settings-current-city"
                        name="currentCityCode"
                        value={formValues.currentCityCode}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Not set</option>
                        {cityOptions.map((city) => (
                          <option key={city.code} value={city.code}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        We use your current city to personalise PPP insights and budget recommendations.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="settings-home-city" className="text-sm font-medium">
                        Home city
                      </label>
                      <select
                        id="settings-home-city"
                        name="homeCityCode"
                        value={formValues.homeCityCode}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Not set</option>
                        {cityOptions.map((city) => (
                          <option key={city.code} value={city.code}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Set a home base to compare purchasing power between cities at a glance.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="settings-monthly-budget" className="text-sm font-medium">
                        Monthly budget goal (USD)
                      </label>
                      <Input
                        id="settings-monthly-budget"
                        name="monthlyBudget"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formValues.monthlyBudget}
                        onChange={handleInputChange}
                        placeholder="e.g. 2500"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your dashboard highlights progress against this goal each month.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button type="submit" disabled={!isDirty || saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={loadProfile}
                      disabled={profileLoading || saving}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/95 shadow-xl">
            <CardHeader>
              <CardTitle>Connected services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Nessie customer ID
                </p>
                <p className="mt-2 rounded-md bg-muted px-3 py-2 font-mono text-xs">
                  {nessie.customerId ?? "Not yet provisioned"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-foreground">
                <div className="rounded-md border border-border bg-muted/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Accounts</p>
                  <p className="text-lg font-semibold">{nessie.accounts.length}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Transactions</p>
                  <p className="text-lg font-semibold">{nessie.transactions.length}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={refreshNessie}
                disabled={syncingNessie}
              >
                {syncingNessie ? "Refreshing Nessie data…" : "Refresh Nessie data"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Refresh the Nessie sandbox connection if you recently updated your customer profile or need the latest
                transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
