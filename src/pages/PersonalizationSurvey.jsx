import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import usePersonalization from '../hooks/usePersonalization.js';
import Lisbon from '../assets/cities/lisbon.jpg';
import {
  TRAVEL_INTEREST_OPTIONS,
  CONTINENT_OPTIONS,
  CATEGORY_FOCUS_OPTIONS,
} from '../lib/personalizationOptions.js';

function toggleSelection(list, value) {
  if (!value) return list;
  if (list.includes(value)) {
    return list.filter((entry) => entry !== value);
  }
  return [...list, value];
}

const DEFAULT_BUDGET = 2500;

export function PersonalizationSurvey() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data, completeOnboarding, loading } = usePersonalization(userId);

  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [travelGoal, setTravelGoal] = useState('Digital nomad life');
  const [travelStyle, setTravelStyle] = useState('Local immersion');
  const [budgetFocus, setBudgetFocus] = useState('Balanced');
  const [travelInterests, setTravelInterests] = useState([]);
  const [preferredContinents, setPreferredContinents] = useState([]);
  const [favoriteCategories, setFavoriteCategories] = useState([]);
  const [curiousCities, setCuriousCities] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data) return;
    setMonthlyBudget(
      typeof data.monthlyBudgetGoal === 'number' && Number.isFinite(data.monthlyBudgetGoal)
        ? String(data.monthlyBudgetGoal)
        : typeof data.monthlyBudget === 'number' && Number.isFinite(data.monthlyBudget)
        ? String(data.monthlyBudget)
        : String(DEFAULT_BUDGET)
    );
    setTravelGoal(data.travelGoal ?? 'Digital nomad life');
    setTravelStyle(data.travelStyle ?? 'Local immersion');
    setBudgetFocus(data.budgetFocus ?? 'Balanced');
    setTravelInterests(Array.isArray(data.travelInterests) ? data.travelInterests : []);
    setPreferredContinents(Array.isArray(data.preferredContinents) ? data.preferredContinents : []);
    setFavoriteCategories(Array.isArray(data.favoriteCategories) ? data.favoriteCategories : []);
    setCuriousCities((data.curiousCities ?? []).join(', '));
  }, [data]);

  const parsedBudget = useMemo(() => {
    const value = Number(monthlyBudget);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }, [monthlyBudget]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!parsedBudget) {
      setError('Enter a realistic monthly budget so we can personalise GeoBudget.');
      return;
    }
    if (!userId) return;

    setError(null);
    setIsSubmitting(true);

    const payload = {
      travelGoal,
      travelStyle,
      budgetFocus,
      monthlyBudget: parsedBudget,
      monthlyBudgetGoal: parsedBudget,
      curiousCities: curiousCities
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      travelInterests,
      preferredContinents,
      favoriteCategories,
      onboardingComplete: true,
    };

    try {
      await completeOnboarding(payload);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      console.error('Failed to save personalization survey', cause);
      setError('We hit turbulence saving your preferences. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSkip = async () => {
    if (userId) {
      try {
        await completeOnboarding({ ...(data ?? {}), onboardingComplete: true });
      } catch (cause) {
        console.warn('Failed to mark onboarding complete on skip', cause);
      }
    }
    navigate('/dashboard', { replace: true });
  };

  const showLoader = loading && !data;

  return (
    <section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden md:block">
        <img src={Lisbon} alt="Lisbon skyline" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-red-200">Personalise Parity</p>
          <h1 className="mt-4 max-w-md font-poppins text-4xl font-semibold leading-tight">
            Unlock travel recommendations tuned to your lifestyle.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-white/80">
            Choose the interests, regions, and budget guardrails that matter. We’ll weave them through GeoBudget,
            nudges, and your dashboard insights.
          </p>
        </div>
      </div>

      <div className="relative flex h-full flex-col justify-center bg-offwhite/95 px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <h2 className="font-poppins text-3xl font-semibold text-navy">Let’s customise your dashboard</h2>
          <p className="mt-3 text-sm text-charcoal/70">
            We’ll sync your Nessie accounts automatically. Tell us how you want Parity to focus your insights.
          </p>

          {showLoader ? (
            <div className="mt-10 text-sm text-charcoal/60">Loading your preferences…</div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-charcoal">Monthly budget goal</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={monthlyBudget}
                  onChange={(event) => setMonthlyBudget(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  placeholder={String(DEFAULT_BUDGET)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-charcoal">Travel goal</label>
                  <select
                    value={travelGoal}
                    onChange={(event) => setTravelGoal(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option>Digital nomad life</option>
                    <option>Short-term relocation</option>
                    <option>Long sabbatical</option>
                    <option>Budget world tour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal">Travel style</label>
                  <select
                    value={travelStyle}
                    onChange={(event) => setTravelStyle(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option>Local immersion</option>
                    <option>Comfort seeker</option>
                    <option>Luxury explorer</option>
                    <option>Remote worker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal">Which expense category should Parity optimise?</label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {['Balanced', 'Rent', 'Food', 'Leisure'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBudgetFocus(option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        budgetFocus === option
                          ? 'border-teal bg-turquoise/20 text-teal shadow-sm'
                          : 'border-navy/15 bg-white text-charcoal'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal">Travel interests</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TRAVEL_INTEREST_OPTIONS.map((option) => {
                    const isActive = travelInterests.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setTravelInterests((prev) => toggleSelection(prev, option))}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? 'border-teal bg-teal/15 text-teal'
                            : 'border-navy/15 bg-white text-charcoal/80 hover:border-teal/50'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal">Preferred continents</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONTINENT_OPTIONS.map((option) => {
                    const isActive = preferredContinents.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPreferredContinents((prev) => toggleSelection(prev, option))}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? 'border-coral bg-coral/15 text-coral'
                            : 'border-navy/15 bg-white text-charcoal/80 hover:border-coral/50'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal">Categories to spotlight</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORY_FOCUS_OPTIONS.map((option) => {
                    const isActive = favoriteCategories.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFavoriteCategories((prev) => toggleSelection(prev, option))}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? 'border-navy bg-navy/15 text-navy'
                            : 'border-navy/15 bg-white text-charcoal/80 hover:border-navy/40'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal">Cities on your radar</label>
                <p className="text-xs text-charcoal/60">Separate with commas. We’ll prioritise them in GeoBudget.</p>
                <input
                  type="text"
                  value={curiousCities}
                  onChange={(event) => setCuriousCities(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-navy/20 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  placeholder="Berlin, Mexico City, Lisbon"
                />
              </div>

              {error && <p className="text-sm text-coral">{error}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm font-semibold text-charcoal/70 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  Skip for now
                </button>
                <Button type="submit" className="justify-center" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving preferences…' : 'Save and continue'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default PersonalizationSurvey;
