"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
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
      await signOut()
      router.replace("/")
    } finally {
      setSigningOut(false)
    }
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
              <>
                <span className="hidden text-sm font-semibold text-foreground/80 sm:inline">{identityLabel}</span>
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={handleSignOut}
                  disabled={signingOut || loading}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              </>
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
