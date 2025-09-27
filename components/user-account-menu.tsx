"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react"
import type { User } from "@supabase/supabase-js"
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  HomeModernIcon,
  MapPinIcon,
  PencilSquareIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import type { NessieAccount } from "@/lib/nessie"
import {
  useUserProfile,
  type UserProfileCity,
  type UserProfileCountry,
  type UserProfileData,
} from "@/hooks/use-user-profile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface UserAccountMenuProps {
  user: User
  identityLabel: string
  onSignOut: () => Promise<void>
  signingOut: boolean
  nessieAccounts: NessieAccount[]
  nessieLoading: boolean
}

function formatCurrency(amount: number, currency?: string | null) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency && currency.length === 3 ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    return `$${amount.toFixed(2)}`
  }
}

function formatPpp(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)
}

function extractInitials(label: string, fallback: string) {
  const trimmed = label.trim()
  if (!trimmed) {
    return fallback
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  if (initials) {
    return initials
  }

  return fallback
}

export function UserAccountMenu({
  user,
  identityLabel,
  onSignOut,
  signingOut,
  nessieAccounts,
  nessieLoading,
}: UserAccountMenuProps) {
  const { profile, loading: profileLoading, error: profileError, refresh } = useUserProfile(user.id)
  const [editOpen, setEditOpen] = useState(false)

  const displayName = profile?.name ?? identityLabel
  const initials = useMemo(() => extractInitials(displayName || user.email || "", "PP"), [displayName, user.email])

  const totalBalance = useMemo(
    () =>
      nessieAccounts.reduce((sum, account) => {
        return sum + (typeof account.balance === "number" ? account.balance : 0)
      }, 0),
    [nessieAccounts],
  )

  const headlineCurrency = nessieAccounts[0]?.currencyCode ?? "USD"
  const formattedBalance = formatCurrency(totalBalance, headlineCurrency)
  const formattedBudget = profile?.monthlyBudget != null ? formatCurrency(profile.monthlyBudget, "USD") : null

  const hasAccounts = nessieAccounts.length > 0
  const topAccounts = nessieAccounts.slice(0, 2)

  async function handleRefreshProfile() {
    try {
      await refresh()
    } catch (error) {
      console.error("Failed to refresh profile", error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="group inline-flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm font-semibold transition-all hover:border-border hover:bg-background/60"
          >
            <Avatar className="size-9 border border-primary/30 bg-primary/10 transition-transform group-data-[state=open]:scale-[1.02]">
              <AvatarFallback className="bg-transparent text-sm font-semibold uppercase text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <UserCircleIcon className="hidden size-5 text-primary sm:block" aria-hidden="true" />
            <div className="flex min-w-0 flex-col text-left">
              <span className="max-w-[10rem] truncate text-sm font-semibold text-foreground/90">{displayName}</span>
              {user.email && (
                <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[24rem] overflow-hidden p-0">
          <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-transparent p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border border-primary/40 bg-primary/10 shadow-sm">
                <AvatarFallback className="text-base font-semibold text-primary">
                  {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">My account</p>
              <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
              {user.email && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={MapPinIcon} title="Current location" loading={profileLoading}>
              {profile?.currentCity ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {profile.currentCity.flag && <span className="mr-1">{profile.currentCity.flag}</span>}
                    {profile.currentCity.name ?? "Unknown city"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.currentCountry?.name ?? "No country selected"}
                  </p>
                  {profile.currentCity.ppp != null && (
                    <p className="text-xs font-medium text-primary">
                      PPP index: {formatPpp(profile.currentCity.ppp)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No current location saved yet.</p>
              )}
            </InfoCard>
            <InfoCard icon={HomeModernIcon} title="Home base" loading={profileLoading}>
              {profile?.homeCity || profile?.homeCountry ? (
                <div className="mt-2 space-y-1">
                  {profile?.homeCity ? (
                    <p className="text-sm font-semibold text-foreground">
                      {profile.homeCity.flag && <span className="mr-1">{profile.homeCity.flag}</span>}
                      {profile.homeCity.name ?? "Unknown city"}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {profile?.homeCountry?.name ?? (profile?.homeCity ? "Country unknown" : "No home country set")}
                  </p>
                  {profile?.homeCity?.ppp != null && (
                    <p className="text-xs font-medium text-primary">
                      PPP index: {formatPpp(profile.homeCity.ppp)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Tell us where you call home.</p>
              )}
            </InfoCard>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={CurrencyDollarIcon} title="Monthly budget" loading={profileLoading}>
              {formattedBudget ? (
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-semibold text-foreground">{formattedBudget}</p>
                  <p className="text-xs text-muted-foreground">Based on your Supabase profile</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Add a budget to plan smarter journeys.</p>
              )}
            </InfoCard>
            <InfoCard icon={BanknotesIcon} title="Financial snapshot" loading={nessieLoading}>
              {hasAccounts ? (
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{formattedBalance}</p>
                    <p className="text-xs text-muted-foreground">
                      Across {nessieAccounts.length} {nessieAccounts.length === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {topAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{account.name}</span>
                        <span>{formatCurrency(account.balance, account.currencyCode)}</span>
                      </div>
                    ))}
                    {nessieAccounts.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{nessieAccounts.length - 2} more account{nessieAccounts.length - 2 === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Connect an account to view balances from Nessie.</p>
              )}
            </InfoCard>
          </div>
          {profileError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {profileError.message}
            </p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            setEditOpen(true)
          }}
        >
          <PencilSquareIcon className="size-4" />
          Manage profile & preferences
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={profileLoading}
          onSelect={(event) => {
            event.preventDefault()
            void handleRefreshProfile()
          }}
        >
          <ArrowPathIcon className="size-4" />
          Refresh profile info
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={signingOut}
          variant="destructive"
          onSelect={() => {
            if (!signingOut) {
              void onSignOut()
            }
          }}
        >
          <ArrowRightOnRectangleIcon className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      <AccountProfileDialog
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        loading={profileLoading}
        onProfileSaved={async () => {
          try {
            await refresh()
          } catch (error) {
            console.error("Failed to refresh profile after save", error)
          }
        }}
      />
    </>
  )
}

interface InfoCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  children: ReactNode
  loading: boolean
}

function InfoCard({ icon: Icon, title, children, loading }: InfoCardProps) {
  return (
    <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      {loading ? <Skeleton className="mt-3 h-5 w-24" /> : children}
    </div>
  )
}

interface AccountProfileDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfileData | null
  loading: boolean
  onProfileSaved?: () => Promise<void> | void
}

interface ProfileFormState {
  name: string
  monthlyBudget: string
  currentCity: UserProfileCity | null
  homeCity: UserProfileCity | null
  currentCountry: UserProfileCountry | null
  homeCountry: UserProfileCountry | null
}

function createInitialFormState(profile: UserProfileData | null, user: User): ProfileFormState {
  const metadataName =
    typeof user.user_metadata?.displayName === "string" && user.user_metadata.displayName.trim()
      ? user.user_metadata.displayName.trim()
      : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : ""

  return {
    name: profile?.name ?? metadataName ?? user.email ?? "",
    monthlyBudget:
      profile?.monthlyBudget != null && Number.isFinite(profile.monthlyBudget)
        ? String(profile.monthlyBudget)
        : "",
    currentCity: profile?.currentCity ?? null,
    homeCity: profile?.homeCity ?? null,
    currentCountry: profile?.currentCountry ?? null,
    homeCountry: profile?.homeCountry ?? null,
  }
}

function parseBudgetInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const cleaned = trimmed.replace(/[^0-9.,-]/g, "").replace(/,/g, "")
  if (!cleaned) return null

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function citiesEqual(a: UserProfileCity | null, b: UserProfileCity | null) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.code === b.code && a.name === b.name && a.flag === b.flag && a.ppp === b.ppp
}

function countriesEqual(a: UserProfileCountry | null, b: UserProfileCountry | null) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.code === b.code && a.name === b.name
}

function AccountProfileDialog({ user, open, onOpenChange, profile, loading, onProfileSaved }: AccountProfileDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<ProfileFormState>(() => createInitialFormState(profile, user))
  const [baseline, setBaseline] = useState<ProfileFormState>(() => createInitialFormState(profile, user))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const initialState = useMemo(() => createInitialFormState(profile, user), [profile, user])

  useEffect(() => {
    if (open) {
      setForm(initialState)
      setBaseline(initialState)
      setFormError(null)
    }
  }, [initialState, open])

  const isDirty = useMemo(() => {
    if (loading) return false
    if (form.name.trim() !== (baseline.name?.trim() ?? "")) return true

    const currentBudget = parseBudgetInput(form.monthlyBudget)
    const baselineBudget = parseBudgetInput(baseline.monthlyBudget)
    if (form.monthlyBudget.trim() !== baseline.monthlyBudget.trim()) return true
    if ((currentBudget ?? null) !== (baselineBudget ?? null)) return true

    if (!citiesEqual(form.currentCity, baseline.currentCity)) return true
    if (!citiesEqual(form.homeCity, baseline.homeCity)) return true
    if (!countriesEqual(form.currentCountry, baseline.currentCountry)) return true
    if (!countriesEqual(form.homeCountry, baseline.homeCountry)) return true

    return false
  }, [baseline, form, loading])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setFormError(null)

      const trimmedName = form.name.trim()
      const parsedBudget = parseBudgetInput(form.monthlyBudget)
      if (form.monthlyBudget.trim() && parsedBudget === null) {
        setFormError("Monthly budget must be a positive number.")
        return
      }

      setSaving(true)
      try {
        const payload = {
          user_id: user.id,
          name: trimmedName || null,
          monthly_budget: parsedBudget,
          current_city_code: form.currentCity?.code ?? null,
          home_city_code: form.homeCity?.code ?? null,
          current_country_code: form.currentCountry?.code ?? null,
          home_country_code: form.homeCountry?.code ?? null,
        }

        const { error } = await supabase.from("user_profile").upsert(payload, { onConflict: "user_id" })
        if (error) throw error

        if (trimmedName) {
          const currentMetadataName =
            typeof user.user_metadata?.displayName === "string"
              ? user.user_metadata.displayName
              : typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : null

          if (trimmedName !== (currentMetadataName?.trim() ?? "")) {
            const { error: metadataError } = await supabase.auth.updateUser({
              data: {
                ...(user.user_metadata ?? {}),
                displayName: trimmedName,
              },
            })
            if (metadataError) {
              console.warn("Failed to sync Supabase auth metadata", metadataError)
            }
          }
        }

        setBaseline({
          ...form,
          name: trimmedName,
          monthlyBudget: form.monthlyBudget.trim() && parsedBudget !== null ? String(parsedBudget) : "",
        })

        await onProfileSaved?.()

        toast({
          title: "Profile updated",
          description: "Your travel preferences have been saved.",
        })

        onOpenChange(false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong while saving your profile."
        setFormError(message)
      } finally {
        setSaving(false)
      }
    },
    [form, onOpenChange, onProfileSaved, toast, user],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-3 text-left">
          <DialogTitle>Update your profile</DialogTitle>
          <DialogDescription>
            Personalise PPP Pocket with your preferred locations and budget to tailor insights for your journey.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                placeholder="e.g. Alex Traveler"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This name appears across the app and in your Supabase profile.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-budget">Monthly travel budget</Label>
              <Input
                id="profile-budget"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="2500"
                value={form.monthlyBudget}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyBudget: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Set a target to get smarter PPP-adjusted planning tips.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CitySearchField
              label="Current base city"
              description="Where you’re currently spending most of your time."
              placeholder="Search for your current city"
              value={form.currentCity}
              onChange={(city) => setForm((prev) => ({ ...prev, currentCity: city }))}
            />
            <CountrySearchField
              label="Current country"
              placeholder="Pick a country"
              value={form.currentCountry}
              onChange={(country) => setForm((prev) => ({ ...prev, currentCountry: country }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CitySearchField
              label="Home city"
              description="Your point of reference when comparing PPP."
              placeholder="Search for your home city"
              value={form.homeCity}
              onChange={(city) => setForm((prev) => ({ ...prev, homeCity: city }))}
            />
            <CountrySearchField
              label="Home country"
              placeholder="Select a country"
              value={form.homeCountry}
              onChange={(country) => setForm((prev) => ({ ...prev, homeCountry: country }))}
            />
          </div>

          {formError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isDirty}>
              {saving && <ArrowPathIcon className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CitySearchFieldProps {
  label: string
  placeholder: string
  value: UserProfileCity | null
  onChange: (value: UserProfileCity | null) => void
  description?: string
}

function CitySearchField({ label, placeholder, value, onChange, description }: CitySearchFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<UserProfileCity[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadCities = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from("ppp_city").select("code, name, flag, ppp").limit(8)

      if (term.trim().length >= 2) {
        query = query.ilike("name", `%${term.trim()}%`)
      } else if (term.trim().length === 1) {
        query = query.ilike("code", `${term.trim()}%`)
      } else {
        query = query.order("ppp", { ascending: false })
      }

      const { data, error: queryError } = await query
      if (queryError) throw queryError

      setOptions(
        (data ?? []).map((city) => ({
          code: city.code ?? null,
          name: city.name ?? null,
          flag: city.flag ?? null,
          ppp: city.ppp != null ? Number(city.ppp) : null,
        })),
      )
    } catch (cause) {
      console.error("Failed to fetch cities", cause)
      setError("Unable to load cities right now. Try again in a moment.")
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    const handler = window.setTimeout(() => {
      if (!active) return
      void loadCities(search)
    }, search.trim().length >= 2 ? 200 : 0)

    return () => {
      active = false
      window.clearTimeout(handler)
    }
  }, [loadCities, open, search])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setError(null)
    }
  }, [open])

  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-foreground/90">{label}</Label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn(
              "justify-between text-left",
              !value && "text-muted-foreground",
            )}
          >
            {value ? (
              <span className="flex w-full items-center gap-2 truncate">
                {value.flag ? <span className="text-lg leading-none">{value.flag}</span> : null}
                <span className="truncate">{value.name ?? value.code ?? "Selected city"}</span>
                {value.ppp != null ? (
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    PPP {formatPpp(value.ppp)}
                  </Badge>
                ) : null}
              </span>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Search for a city" />
            <CommandList>
              <CommandEmpty>{loading ? "Searching cities…" : "No cities match your search."}</CommandEmpty>
              {options.length > 0 ? (
                <CommandGroup heading="Suggestions">
                  {options.map((option) => (
                    <CommandItem
                      key={`${option.code ?? option.name ?? "city"}`}
                      value={option.code ?? option.name ?? "city"}
                      onSelect={() => {
                        onChange(option)
                        setOpen(false)
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {option.flag ? <span className="text-lg leading-none">{option.flag}</span> : null}
                          {option.name ?? option.code ?? "Unnamed city"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Code {option.code ?? "N/A"}
                          {option.ppp != null ? ` · PPP ${formatPpp(option.ppp)}` : ""}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {value ? (
                <CommandGroup>
                  <CommandItem
                    value="__clear-city"
                    onSelect={() => {
                      onChange(null)
                      setOpen(false)
                    }}
                  >
                    <XMarkIcon className="size-4" /> Clear selection
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
          {error ? (
            <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface CountrySearchFieldProps {
  label: string
  placeholder: string
  value: UserProfileCountry | null
  onChange: (value: UserProfileCountry | null) => void
}

function CountrySearchField({ label, placeholder, value, onChange }: CountrySearchFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<UserProfileCountry[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadCountries = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from("country_ref").select("code, country").order("country", { ascending: true }).limit(10)

      if (term.trim().length >= 1) {
        query = query.ilike("country", `%${term.trim()}%`)
      }

      const { data, error: queryError } = await query
      if (queryError) throw queryError

      setOptions(
        (data ?? []).map((country) => ({
          code: country.code ?? null,
          name: country.country ?? null,
        })),
      )
    } catch (cause) {
      console.error("Failed to fetch countries", cause)
      setError("Unable to load countries right now. Please try again shortly.")
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    const handler = window.setTimeout(() => {
      if (!active) return
      void loadCountries(search)
    }, search.trim().length >= 1 ? 200 : 0)

    return () => {
      active = false
      window.clearTimeout(handler)
    }
  }, [loadCountries, open, search])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setError(null)
    }
  }, [open])

  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-foreground/90">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn(
              "justify-between text-left",
              !value && "text-muted-foreground",
            )}
          >
            {value ? (
              <span className="flex w-full items-center gap-2 truncate">
                <span className="truncate">{value.name ?? value.code ?? "Selected country"}</span>
                {value.code ? (
                  <Badge variant="outline" className="ml-auto shrink-0">
                    {value.code}
                  </Badge>
                ) : null}
              </span>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Search for a country" />
            <CommandList>
              <CommandEmpty>{loading ? "Searching countries…" : "No countries match your search."}</CommandEmpty>
              {options.length > 0 ? (
                <CommandGroup heading="Countries">
                  {options.map((option) => (
                    <CommandItem
                      key={option.code ?? option.name ?? "country"}
                      value={option.code ?? option.name ?? "country"}
                      onSelect={() => {
                        onChange(option)
                        setOpen(false)
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{option.name ?? option.code ?? "Unnamed country"}</span>
                        {option.code ? (
                          <span className="text-xs text-muted-foreground">Code {option.code}</span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {value ? (
                <CommandGroup>
                  <CommandItem
                    value="__clear-country"
                    onSelect={() => {
                      onChange(null)
                      setOpen(false)
                    }}
                  >
                    <XMarkIcon className="size-4" /> Clear selection
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
          {error ? (
            <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
