import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import Button from '../components/ui/Button.jsx';
import AuthPageShell from '../components/layout/AuthPageShell.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <AuthPageShell
      title="Welcome back to your travel command center"
      description="Pick up where you left off with fresh PPP insights, synced Nessie balances, and a dashboard that floats with you."
    >
      <h2 className="text-2xl font-semibold text-navy">Sign in</h2>
      <p className="mt-2 text-sm text-charcoal/70">
        Use the email and password you registered with Supabase to unlock your personalised PPP Pocket experience.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-charcoal">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-charcoal">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            placeholder="••••••••"
          />
        </div>
        {formError && <p className="text-sm text-coral">{formError}</p>}
        <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">
        Need an account?{' '}
        <Link to={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-red hover:underline">
          Create one
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default LoginPage;
