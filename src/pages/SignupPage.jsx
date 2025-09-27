import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import Button from '../components/ui/Button.jsx';

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!displayName.trim()) {
      setFormError('Please choose a display name.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    // ✅ Create account with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() }, // stored in user metadata
      },
    });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // ✅ Store user identity in your `users` table
    if (data?.user) {
      await persistUserIdentity(data.user, displayName.trim());
    }

    // ✅ Redirect user if auto-confirmation is enabled
    if (data.session) {
      navigate(redirectTo, { replace: true });
    } else {
      // Otherwise tell them to check email
      setMessage('Account created!');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-navy/10 bg-white/95 p-8 shadow-xl shadow-navy/10">
        <h1 className="text-2xl font-semibold text-navy">Create your account</h1>
        <p className="mt-2 text-sm text-charcoal/70">
          We’ll link your account and prepare your Nessie sandbox data as soon as you confirm your email address.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="signup-display-name" className="block text-sm font-semibold text-charcoal">
              Username
            </label>
            <input
              id="signup-display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
              placeholder="What's your full name?"
            />
          </div>

          {/* Email */}
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
              className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className="block text-sm font-semibold text-charcoal">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
              placeholder="Create a secure password"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="signup-confirm-password" className="block text-sm font-semibold text-charcoal">
              Confirm password
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
              placeholder="Re-enter your password"
            />
          </div>

          {/* Errors & messages */}
          {formError && <p className="text-sm text-coral">{formError}</p>}
          {message && <p className="text-sm text-teal">{message}</p>}

          {/* Submit button */}
          <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        {/* Already have account */}
        <p className="mt-6 text-center text-sm text-charcoal/70">
          Already have an account?{' '}
          <Link
            to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-red hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;

// 🔹 Persist user identity to Supabase tables
async function persistUserIdentity(user, displayName) {
  if (!user?.id) return;

  const userRecord = {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
  };

  try {
    const { error } = await supabase.from('users').upsert(userRecord, { onConflict: 'id' });
    if (error) console.warn('Unable to save user row', error);
  } catch (err) {
    console.warn('Error saving user row', err);
  }
}
