"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { UserCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Planner", href: "/planner" },
  { name: "Insights", href: "/insights" },
  { name: "Share", href: "/share" },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const identityLabel = useMemo(() => {
    const metadata = user?.user_metadata ?? {}
    const candidates: string[] = []

    if (typeof metadata.displayName === "string" && metadata.displayName.trim()) {
      candidates.push(metadata.displayName.trim())
    }

    if (typeof metadata.name === "string" && metadata.name.trim()) {
      candidates.push(metadata.name.trim())
    }

    const first = typeof metadata.first_name === "string" ? metadata.first_name.trim() : ""
    const last = typeof metadata.last_name === "string" ? metadata.last_name.trim() : ""
    const full = [first, last].filter(Boolean).join(" ")
    if (full) {
      candidates.push(full)
    }

    return candidates[0] ?? user?.email ?? "Logged in"
  }, [user])

  async function handleSignOut() {
    try {
      setSigningOut(true)
      setAccountMenuOpen(false)
      await signOut()
      router.replace("/")
    } finally {
      setSigningOut(false)
    }
  }

  function setAccountMenuVisibility(open: boolean) {
    if (!user) return
    setAccountMenuOpen(open)
  }

  function toggleAccountMenu() {
    setAccountMenuVisibility(!accountMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">PP</span>
            </div>
            <span className="hidden font-bold text-foreground sm:inline-block">PPP Pocket</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-3 md:justify-end">
          <Link className="inline-flex items-center space-x-2 md:hidden" href="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">PP</span>
            </div>
            <span className="font-bold text-foreground">PPP Pocket</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <div
                className="relative"
                onMouseEnter={() => setAccountMenuVisibility(true)}
                onMouseLeave={() => setAccountMenuVisibility(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setAccountMenuVisibility(false)
                  }
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="flex items-center gap-2 text-sm"
                  onClick={toggleAccountMenu}
                  onFocus={() => setAccountMenuVisibility(true)}
                  aria-haspopup="true"
                  aria-expanded={accountMenuOpen}
                >
                  <UserCircleIcon className="h-5 w-5 text-foreground/70" />
                  <span className="hidden sm:inline">{identityLabel}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${
                      accountMenuOpen ? "rotate-180 text-foreground" : "text-foreground/50"
                    }`}
                  />
                </Button>
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg">
                    <div className="space-y-2 text-sm">
                      <Link
                        href="/settings"
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2 font-semibold transition-colors",
                          pathname === "/settings"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                        onClick={() => setAccountMenuVisibility(false)}
                      >
                        <span>Settings</span>
                        <span aria-hidden>→</span>
                      </Link>
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full justify-between text-sm"
                        onClick={handleSignOut}
                        disabled={signingOut || loading}
                      >
                        <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="text-sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
