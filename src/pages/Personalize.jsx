import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import usePersonalization from '../hooks/usePersonalization.js';
import { useUserProfile } from '../hooks/useUserProfile.js';

const TRAVEL_GOALS = ['Digital nomad life', 'Short-term relocation', 'Long sabbatical', 'Budget world tour'];
const TRAVEL_STYLES = ['Comfort seeker', 'Local immersion', 'Luxury explorer', 'Remote worker'];
const BUDGET_FOCUS = ['Rent', 'Food', 'Leisure', 'Balanced'];

function normaliseCities(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((city) => city.trim())
    .filter(Boolean);
}

export function Personalize() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  const { data: personalization, loading, error, completeOnboarding } = usePersonalization(userId);

  const [travelGoal, setTravelGoal] = useState('Digital nomad life');
  const [travelStyle, setTravelStyle] = useState('Local immersion');
  const [budgetFocus, setBudgetFocus] = useState('Balanced');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialised, setInitialised] = useState(false);

  const displayName = useMemo(() => {
    if (profile?.name) return profile.name;
    const metadata = user?.user_metadata ?? {};
    if (metadata.displayName) return metadata.displayName;
    if (metadata.full_name) return metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  }, [profile?.name, user]);

  useEffect(() => {
    if (loading) return;
    if (personalization?.onboardingComplete) {
      const next = searchParams.get('next') ?? '/dashboard';
      navigate(next, { replace: true });
    }
  }, [loading, personalization?.onboardingComplete, navigate, searchParams]);

  useEffect(() => {
    if (loading || initialised) return;
    const defaults = personalization ?? {};
    setTravelGoal(defaults.travelGoal ?? 'Digital nomad life');
    setTravelStyle(defaults.travelStyle ?? 'Local immersion');
    setBudgetFocus(defaults.budgetFocus ?? 'Balanced');

    const fallbackBudget = (() => {
      if (typeof defaults.monthlyBudget === 'number' && Number.isFinite(defaults.monthlyBudget)) {
        return String(defaults.monthlyBudget);
      }
      if (typeof profile?.monthlyBudget === 'number' && Number.isFinite(profile.monthlyBudget)) {
        return String(profile.monthlyBudget);
      }
      return '';
    })();

    setMonthlyBudget(fallbackBudget);
    setCityInput((defaults.curiousCities ?? []).join(', '));
    setInitialised(true);
  }, [initialised, loading, personalization, profile?.monthlyBudget]);

  const parsedBudget = useMemo(() => {
    const numeric = Number(monthlyBudget);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
  }, [monthlyBudget]);

  const curiousCities = useMemo(() => normaliseCities(cityInput), [cityInput]);

  const personalizationError = formError ?? error?.message ?? null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!parsedBudget) {
      setFormError('Tell us roughly how much you spend each month so we can plan smarter.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await completeOnboarding({
        travelGoal,
        travelStyle,
        budgetFocus,
        monthlyBudget: parsedBudget,
        curiousCities,
      });

      const next = searchParams.get('next') ?? '/dashboard';
      setIsSaving(false);
      navigate(next, { replace: true });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save your preferences. Please try again.';
      setFormError(message);
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    setFormError(null);

    try {
      await completeOnboarding({
        travelGoal,
        travelStyle,
        budgetFocus,
        monthlyBudget: parsedBudget ?? null,
        curiousCities,
        onboardingComplete: true,
      });

      const next = searchParams.get('next') ?? '/dashboard';
      setIsSaving(false);
      navigate(next, { replace: true });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to update your preferences. Please try again.';
      setFormError(message);
      setIsSaving(false);
    }
  };

  const isBusy = isSaving || loading;

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Welcome aboard</p>
        <h1 className="font-poppins text-4xl font-semibold text-navy">
          {displayName ? `Hey ${displayName.split(' ')[0]},` : 'Hey there,'}
          <br />
          let’s personalise your dashboard.
        </h1>
        <p className="max-w-2xl text-sm text-charcoal/70">
          Answer a few quick questions so we can highlight the right cities, savings insights, and travel runway for you.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl bg-white/90 p-8 shadow-xl shadow-navy/10">
        <div>
          <label className="block text-sm font-semibold text-charcoal">What’s your monthly travel budget?</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={monthlyBudget}
            onChange={(event) => setMonthlyBudget(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="e.g. 2500"
            required
          />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-charcoal">Which part of your budget matters most?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BUDGET_FOCUS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBudgetFocus(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                  budgetFocus === option
                    ? 'border-teal bg-turquoise/20 text-teal shadow-md'
                    : 'border-navy/15 bg-white text-charcoal'
                }`}
                aria-pressed={budgetFocus === option}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-charcoal">What’s your current travel goal?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TRAVEL_GOALS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition hover:border-teal ${
                  travelGoal === option ? 'border-teal bg-turquoise/20 text-teal shadow-sm' : 'border-navy/15 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="travel-goal"
                  value={option}
                  checked={travelGoal === option}
                  onChange={() => setTravelGoal(option)}
                  className="h-4 w-4 text-teal focus:ring-teal"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-charcoal">Describe your travel style</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TRAVEL_STYLES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTravelStyle(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                  travelStyle === option
                    ? 'border-coral bg-coral/10 text-coral shadow-md'
                    : 'border-navy/15 bg-white text-charcoal'
                }`}
                aria-pressed={travelStyle === option}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-semibold text-charcoal">Which cities are you curious about?</label>
          <p className="text-xs text-charcoal/60">Separate with commas and we’ll highlight them in GeoBudget.</p>
          <input
            type="text"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="Berlin, Mexico City, Lisbon"
          />
          {curiousCities.length > 0 && (
            <p className="mt-2 text-xs text-charcoal/60">
              We’ll prioritise insights for: <span className="font-semibold text-teal">{curiousCities.join(', ')}</span>
            </p>
          )}
        </div>

        {personalizationError && <p className="text-sm text-coral">{personalizationError}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-semibold text-charcoal/70 underline-offset-4 hover:text-charcoal hover:underline"
            disabled={isBusy}
          >
            Skip for now
          </button>
          <Button type="submit" className="justify-center" disabled={isBusy}>
            {isBusy ? 'Saving preferences…' : 'Personalise my dashboard'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default Personalize;
