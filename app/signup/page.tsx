"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { Navigation } from "@/components/navigation"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"
  const { signUp, user, loading } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo)
    }
  }, [loading, user, router, redirectTo])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!displayName.trim()) {
      setError("Please choose a display name")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setSubmitting(true)

    try {
      const result = await signUp({ email, password, displayName: displayName.trim() })
      if (result === "session") {
        router.replace(redirectTo)
      } else {
        setMessage("Check your inbox for a confirmation email before signing in.")
        setSubmitting(false)
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Unable to create an account"
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-border/50 bg-card/80 p-8 shadow-xl shadow-primary/10 backdrop-blur">
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll sync your Nessie sandbox data as soon as you confirm your email address.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="signup-display-name">Display name</Label>
              <Input
                id="signup-display-name"
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should we greet you?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a secure password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm password</Label>
              <Input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            <Button type="submit" className="w-full justify-center" disabled={submitting || loading}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
