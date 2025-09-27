import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import {
  TRAVEL_INTEREST_OPTIONS,
  CONTINENT_OPTIONS,
  CATEGORY_FOCUS_OPTIONS,
} from '../../lib/personalizationOptions.js';

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

function toggleSelection(list, value) {
  if (!value) return list;
  if (list.includes(value)) {
    return list.filter((entry) => entry !== value);
  }
  return [...list, value];
}

export function OnboardingModal({
  isOpen,
  defaultValues = {},
  onComplete,
  onSkip,
  displayName,
}) {
  const [travelGoal, setTravelGoal] = useState(defaultValues.travelGoal ?? 'Digital nomad life');
  const [travelStyle, setTravelStyle] = useState(defaultValues.travelStyle ?? 'Local immersion');
  const [budgetFocus, setBudgetFocus] = useState(defaultValues.budgetFocus ?? 'Balanced');
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    if (typeof defaultValues.monthlyBudget === 'number' && Number.isFinite(defaultValues.monthlyBudget)) {
      return String(defaultValues.monthlyBudget);
    }
    return '';
  });
  const [cityInput, setCityInput] = useState((defaultValues.curiousCities ?? []).join(', '));
  const [travelInterests, setTravelInterests] = useState(defaultValues.travelInterests ?? []);
  const [preferredContinents, setPreferredContinents] = useState(defaultValues.preferredContinents ?? []);
  const [favoriteCategories, setFavoriteCategories] = useState(defaultValues.favoriteCategories ?? []);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTravelGoal(defaultValues.travelGoal ?? 'Digital nomad life');
    setTravelStyle(defaultValues.travelStyle ?? 'Local immersion');
    setBudgetFocus(defaultValues.budgetFocus ?? 'Balanced');
    setMonthlyBudget(
      typeof defaultValues.monthlyBudget === 'number' && Number.isFinite(defaultValues.monthlyBudget)
        ? String(defaultValues.monthlyBudget)
        : ''
    );
    setCityInput((defaultValues.curiousCities ?? []).join(', '));
    setTravelInterests(defaultValues.travelInterests ?? []);
    setPreferredContinents(defaultValues.preferredContinents ?? []);
    setFavoriteCategories(defaultValues.favoriteCategories ?? []);
  }, [defaultValues, isOpen]);

  const parsedBudget = useMemo(() => {
    const numeric = Number(monthlyBudget);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  }, [monthlyBudget]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!parsedBudget) {
      setError('Tell us roughly how much you spend each month so we can plan smarter.');
      return;
    }
    setError(null);
    const payload = {
      travelGoal,
      travelStyle,
      budgetFocus,
      monthlyBudget: parsedBudget,
      monthlyBudgetGoal: parsedBudget,
      curiousCities: normaliseCities(cityInput),
      travelInterests,
      preferredContinents,
      favoriteCategories,
    };
    onComplete?.(payload);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="relative w-full max-w-2xl rounded-3xl bg-offwhite p-8 shadow-2xl"
          >
            <div className="absolute right-6 top-6 text-xs uppercase tracking-[0.3em] text-teal/60">Welcome</div>
            <h2 className="pr-12 font-poppins text-3xl font-semibold text-navy">
              {displayName ? `Hey ${displayName.split(' ')[0]},` : 'Hey there,'}
              <br />
              let’s personalise your dashboard.
            </h2>
            <p className="mt-3 text-sm text-charcoal/70">
              Answer a few quick questions so we can tailor cities, insights, and savings for you.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-charcoal">What excites you most when you travel?</legend>
                <p className="text-xs text-charcoal/60">Pick a few — we’ll tailor GeoBudget and nudges around them.</p>
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
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-charcoal">Preferred continents</legend>
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
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-charcoal">Spending categories to optimise</legend>
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
              </div>

              {error && <p className="text-sm text-coral">{error}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm font-semibold text-charcoal/70 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  Skip for now
                </button>
                <Button type="submit" className="justify-center">
                  Personalise my dashboard
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingModal;
