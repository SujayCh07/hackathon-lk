import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import usePersonalization from '../hooks/usePersonalization.js';
import Button from '../components/ui/Button.jsx';
import LisbonImage from '../assets/cities/lisbon.jpg';
import {
  BUDGET_FOCUS,
  CATEGORY_TAGS,
  CONTINENT_OPTIONS,
  TRAVEL_GOALS,
  TRAVEL_INTERESTS,
  TRAVEL_STYLES,
} from '../constants/personalization.js';

function toggleValue(setter, value) {
  setter((prev) => {
    if (prev.includes(value)) {
      return prev.filter((entry) => entry !== value);
    }
    return [...prev, value];
  });
}

export function Personalize() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const { data, save, completeOnboarding, loading } = usePersonalization(userId);

  const [travelGoal, setTravelGoal] = useState(data?.travelGoal ?? TRAVEL_GOALS[0]);
  const [travelStyle, setTravelStyle] = useState(data?.travelStyle ?? TRAVEL_STYLES[0]);
  const [budgetFocus, setBudgetFocus] = useState(data?.budgetFocus ?? BUDGET_FOCUS[0]);
  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    typeof data?.monthlyBudget === 'number' ? String(data.monthlyBudget) : ''
  );
  const [monthlyBudgetGoal, setMonthlyBudgetGoal] = useState(() =>
    typeof data?.monthlyBudgetGoal === 'number' ? String(data.monthlyBudgetGoal) : ''
  );
  const [travelInterests, setTravelInterests] = useState(data?.travelInterests ?? []);
  const [preferredContinents, setPreferredContinents] = useState(data?.preferredContinents ?? []);
  const [favoriteCategories, setFavoriteCategories] = useState(data?.favoriteCategories ?? []);
  const [curiousCities, setCuriousCities] = useState((data?.curiousCities ?? []).join(', '));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !userId) {
      navigate('/login', { replace: true });
    }
  }, [loading, navigate, userId]);

  useEffect(() => {
    if (!loading && data) {
      setTravelGoal(data.travelGoal ?? TRAVEL_GOALS[0]);
      setTravelStyle(data.travelStyle ?? TRAVEL_STYLES[0]);
      setBudgetFocus(data.budgetFocus ?? BUDGET_FOCUS[0]);
      setMonthlyBudget(
        typeof data.monthlyBudget === 'number' && Number.isFinite(data.monthlyBudget)
          ? String(data.monthlyBudget)
          : ''
      );
      setMonthlyBudgetGoal(
        typeof data.monthlyBudgetGoal === 'number' && Number.isFinite(data.monthlyBudgetGoal)
          ? String(data.monthlyBudgetGoal)
          : ''
      );
      setTravelInterests(data.travelInterests ?? []);
      setPreferredContinents(data.preferredContinents ?? []);
      setFavoriteCategories(data.favoriteCategories ?? []);
      setCuriousCities((data.curiousCities ?? []).join(', '));
    }
  }, [data, loading]);

  const parsedBudget = useMemo(() => {
    const numeric = Number(monthlyBudget);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [monthlyBudget]);

  const parsedGoal = useMemo(() => {
    const numeric = Number(monthlyBudgetGoal);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [monthlyBudgetGoal]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!parsedBudget) {
      setError('Let us know your typical monthly budget to personalise recommendations.');
      return;
    }
    setError(null);
    setSaving(true);

    const payload = {
      travelGoal,
      travelStyle,
      budgetFocus,
      monthlyBudget: parsedBudget,
      monthlyBudgetGoal: parsedGoal,
      travelInterests,
      preferredContinents,
      favoriteCategories,
      curiousCities: curiousCities
        .split(',')
        .map((city) => city.trim())
        .filter(Boolean),
    };

    try {
      await save(payload);
      await completeOnboarding(payload);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      console.error('Failed to save personalization', cause);
      setError('We hit turbulence saving your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden md:block">
        <img src={LisbonImage} alt="Lisbon skyline" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy/80 via-navy/50 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end px-12 py-16 text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-white/80">Parity onboarding</p>
          <h1 className="max-w-md font-poppins text-4xl font-bold leading-tight">Tailor Parity to your travel vibe.</h1>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Dial in your interests, budget goals, and dream destinations so GeoBudget and Smart-Spend can deliver personal nudges.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-gradient-to-br from-white via-sky/5 to-offwhite px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-xl">
          <h2 className="text-2xl font-semibold text-navy">Personalisation survey</h2>
          <p className="mt-2 text-sm text-slate/70">This keeps your dashboard, GeoBudget, and nudges relevant.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">
                Monthly travel budget (USD)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={(event) => setMonthlyBudget(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate/20 bg-white/90 px-4 py-3 text-sm text-navy shadow-inner focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                placeholder="e.g. 2500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">
                Monthly savings goal (USD)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudgetGoal}
                onChange={(event) => setMonthlyBudgetGoal(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate/20 bg-white/90 px-4 py-3 text-sm text-navy shadow-inner focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
                placeholder="e.g. 1800"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Budget focus</legend>
              <div className="flex flex-wrap gap-2">
                {BUDGET_FOCUS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setBudgetFocus(option)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      budgetFocus === option
                        ? 'bg-teal text-white shadow-lg shadow-teal/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-teal/30'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Travel goals</legend>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setTravelGoal(goal)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      travelGoal === goal
                        ? 'bg-coral text-white shadow-lg shadow-coral/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-coral/30'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Travel style</legend>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setTravelStyle(style)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      travelStyle === style
                        ? 'bg-navy text-white shadow-lg shadow-navy/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-navy/30'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Travel interests</legend>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleValue(setTravelInterests, interest)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      travelInterests.includes(interest)
                        ? 'bg-teal text-white shadow-lg shadow-teal/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-teal/30'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Preferred continents</legend>
              <div className="flex flex-wrap gap-2">
                {CONTINENT_OPTIONS.map((continent) => (
                  <button
                    key={continent}
                    type="button"
                    onClick={() => toggleValue(setPreferredContinents, continent)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      preferredContinents.includes(continent)
                        ? 'bg-coral text-white shadow-lg shadow-coral/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-coral/30'
                    }`}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">Favourite categories</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TAGS.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleValue(setFavoriteCategories, category)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      favoriteCategories.includes(category)
                        ? 'bg-slate text-white shadow-lg shadow-slate/20'
                        : 'bg-white/90 text-slate border border-slate/20 hover:border-slate/30'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate/60">
                Cities on your radar
              </label>
              <input
                type="text"
                value={curiousCities}
                onChange={(event) => setCuriousCities(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate/20 bg-white/90 px-4 py-3 text-sm text-navy shadow-inner focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="Lisbon, Mexico City, Berlin"
              />
              <p className="mt-1 text-xs text-slate/60">Separate with commas and we’ll prioritise them in GeoBudget.</p>
            </div>

            {error && <p className="text-sm text-coral">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="justify-center"
              >
                Skip for now
              </Button>
              <Button type="submit" className="justify-center" disabled={saving}>
                {saving ? 'Saving…' : 'Save and continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Personalize;
