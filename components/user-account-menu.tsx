"use client"

import { useMemo, type ComponentType, type ReactNode, type SVGProps } from "react"
import type { User } from "@supabase/supabase-js"
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  HomeModernIcon,
  MapPinIcon,
  UserCircleIcon,
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
import { useUserProfile } from "@/hooks/use-user-profile"

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-semibold transition-all hover:border-border hover:bg-background/60"
        >
          <UserCircleIcon className="size-5 text-primary transition-transform group-data-[state=open]:rotate-6" />
          <span className="max-w-[10rem] truncate text-left text-sm font-semibold text-foreground/90">
            {displayName}
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] overflow-hidden p-0">
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
