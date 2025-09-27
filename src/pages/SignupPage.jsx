import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { upsertUserProfileName, upsertUserRow } from "../lib/userIdentity.js";
import { ensureNessieCustomer, persistNessieCustomerId } from "../lib/nessie.js"; // 🔥 Nessie helpers
import Button from "../components/ui/Button.jsx";
import Barcelona from "../assets/cities/barcelona.jpg"; // background image

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirectTo") ?? "/personalize";

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!displayName.trim()) {
      setFormError("Please choose a full name.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName.trim(),
          displayName: displayName.trim(),
        },
      },
    });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user) {
      await persistUserIdentity(data.user, displayName.trim());

      // 🔥 Create Nessie customer and attach ID
      try {
        const { customerId } = await ensureNessieCustomer(data.user, { persist: false });
        await persistNessieCustomerId({
          userId: data.user.id,
          customerId,
          metadata: data.user.user_metadata ?? {},
        });
      } catch (err) {
        console.error("Failed to set up Nessie profile:", err);
        setFormError("We couldn’t set up your banking profile. Try again.");
        setIsSubmitting(false);
        return;
      }
    }

    if (data.session) {
      navigate(redirectTo, { replace: true });
      return;
    }

    setMessage("Check your inbox for a confirmation email before signing in.");
    setIsSubmitting(false);
  }

  return (
    <section className="grid h-screen grid-cols-1 md:grid-cols-2">
      {/* Left side background with overlay */}
      <div className="relative hidden md:block">
        <img src={Barcelona} alt="City view"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center px-12 text-white">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-red-300">
            Launch your PPP Passport
          </p>
          <h1 className="max-w-lg font-poppins text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Create your account
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/80">
            Claim your seat in the cabin, choose a username, and we’ll set up your customer account so you’re ready for takeoff.
          </p>
        </div>
      </div>

      {/* Right side signup form */}
      <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-white/95 via-sky/10 to-offwhite/90 px-8 sm:px-12 md:px-16 lg:px-24">
        <div className="relative">
          <h2 className="text-2xl font-semibold text-navy">Sign Up</h2>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="signup-display-name" className="block text-sm font-semibold text-charcoal">
                Full name
              </label>
              <input
                id="signup-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="What is your full name?"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-semibold text-charcoal">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-semibold text-charcoal">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="Create a secure password"
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-semibold text-charcoal">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-navy/20 bg-white/70 px-4 py-3 text-sm text-charcoal"
                placeholder="Re-enter your password"
              />
            </div>
            {formError && <p className="text-sm text-coral">{formError}</p>}
            {message && <p className="text-sm text-teal">{message}</p>}
            <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-charcoal/70">
            Already have an account?{" "}
            <Link to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-red hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default SignupPage;

async function persistUserIdentity(user, displayName) {
  if (!user?.id) return;
  await upsertUserRow({ id: user.id, email: user.email ?? null });

  const trimmedName = displayName?.trim();
  if (trimmedName) {
    await upsertUserProfileName({ userId: user.id, displayName: trimmedName });
  }
}
