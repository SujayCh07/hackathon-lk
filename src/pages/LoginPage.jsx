import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { ensureNessieCustomer, persistNessieCustomerId } from "../lib/nessie.js";  // 🔥 Nessie helpers
import Button from "../components/ui/Button.jsx";
import Bali from "../assets/cities/bali.jpg"; // background image

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    const user = data.user;

    // 🔥 Ensure Nessie customer exists
    try {
      const { customerId } = await ensureNessieCustomer(user, { persist: false });
      await persistNessieCustomerId({
        userId: user.id,
        customerId,
        metadata: user.user_metadata ?? {},
      });
    } catch (err) {
      console.error("Failed to sync Nessie customer:", err);
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <section className="grid h-screen grid-cols-1 md:grid-cols-2">
      {/* Left side background */}
      <div className="relative hidden md:block">
        <img src={Bali} alt="Bali beach cliffs"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center px-12 text-white">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-red-300">
            Your PPP Passport Awaits
          </p>
          <h1 className="max-w-lg font-poppins text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Welcome back to your travel command center
          </h1>
        </div>
      </div>

      {/* Right side login form */}
      <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-white/95 via-sky/10 to-offwhite/90 px-8 sm:px-12 md:px-16 lg:px-24">
        <div className="relative">
          <h2 className="text-2xl font-semibold text-navy">Log In</h2>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-charcoal">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-charcoal">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="••••••••"
              />
            </div>
            {formError && <p className="text-sm text-coral">{formError}</p>}
            <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-charcoal/70">
            Need an account?{" "}
            <Link to={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-red hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
