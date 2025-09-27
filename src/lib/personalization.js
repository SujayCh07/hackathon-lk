import { supabase } from './supabase.js';

const LOCAL_STORAGE_KEY = 'ppp_personalization';

function readLocalFallback(userId) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_KEY}:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to read personalization from localStorage', error);
    return null;
  }
}

function writeLocalFallback(userId, payload) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_KEY}:${userId}`, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist personalization to localStorage', error);
  }
}

function normaliseTextArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter((entry) => entry.length > 0);
      }
    } catch (error) {
      // fall through to comma split
    }
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

export async function loadPersonalization(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_personalization')
      .select(
        `user_id,
         travel_goal,
         travel_style,
         budget_focus,
         monthly_budget,
         monthly_budget_goal,
         curious_cities,
         travel_interests,
         preferred_continents,
         favorite_categories,
         onboarding_complete,
         created_at,
         updated_at`
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const local = readLocalFallback(userId);
      return local ?? null;
    }

    const parsedCities = (() => {
      if (!data.curious_cities) return [];
      if (Array.isArray(data.curious_cities)) return data.curious_cities;
      if (typeof data.curious_cities === 'string') {
        try {
          const parsed = JSON.parse(data.curious_cities);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          return data.curious_cities
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
        }
      }
      return [];
    })();

    const payload = {
      userId,
      travelGoal: data.travel_goal ?? null,
      travelStyle: data.travel_style ?? null,
      budgetFocus: data.budget_focus ?? null,
      monthlyBudget: typeof data.monthly_budget === 'number' ? data.monthly_budget : null,
      monthlyBudgetGoal: typeof data.monthly_budget_goal === 'number' ? data.monthly_budget_goal : null,
      curiousCities: parsedCities,
      travelInterests: normaliseTextArray(data.travel_interests),
      preferredContinents: normaliseTextArray(data.preferred_continents),
      favoriteCategories: normaliseTextArray(data.favorite_categories),
      onboardingComplete: Boolean(data.onboarding_complete),
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,
    };

    writeLocalFallback(userId, payload);
    return payload;
  } catch (error) {
    console.warn('Failed to load personalization from Supabase, falling back to local cache', error);
    const fallback = readLocalFallback(userId);
    return fallback ?? null;
  }
}

export async function savePersonalization(userId, payload) {
  if (!userId) return null;

  const serialised = {
    travel_goal: payload.travelGoal ?? null,
    travel_style: payload.travelStyle ?? null,
    budget_focus: payload.budgetFocus ?? null,
    monthly_budget:
      typeof payload.monthlyBudget === 'number' && Number.isFinite(payload.monthlyBudget)
        ? payload.monthlyBudget
        : null,
    monthly_budget_goal:
      typeof payload.monthlyBudgetGoal === 'number' && Number.isFinite(payload.monthlyBudgetGoal)
        ? payload.monthlyBudgetGoal
        : null,
    curious_cities: Array.isArray(payload.curiousCities)
      ? payload.curiousCities.filter(Boolean)
      : [],
    travel_interests: Array.isArray(payload.travelInterests)
      ? payload.travelInterests.filter(Boolean)
      : [],
    preferred_continents: Array.isArray(payload.preferredContinents)
      ? payload.preferredContinents.filter(Boolean)
      : [],
    favorite_categories: Array.isArray(payload.favoriteCategories)
      ? payload.favoriteCategories.filter(Boolean)
      : [],
    onboarding_complete: payload.onboardingComplete ?? false,
  };

  try {
    const { data, error } = await supabase
      .from('user_personalization')
      .upsert(
        {
          user_id: userId,
          ...serialised,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    const normalised = {
      userId,
      travelGoal: data?.travel_goal ?? serialised.travel_goal,
      travelStyle: data?.travel_style ?? serialised.travel_style,
      budgetFocus: data?.budget_focus ?? serialised.budget_focus,
      monthlyBudget: data?.monthly_budget ?? serialised.monthly_budget,
      monthlyBudgetGoal: data?.monthly_budget_goal ?? serialised.monthly_budget_goal,
      curiousCities: (() => {
        const source = data?.curious_cities ?? serialised.curious_cities;
        if (Array.isArray(source)) return source;
        if (typeof source === 'string') {
          try {
            const parsed = JSON.parse(source);
            return Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            return source
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean);
          }
        }
        return [];
      })(),
      travelInterests: normaliseTextArray(data?.travel_interests ?? serialised.travel_interests),
      preferredContinents: normaliseTextArray(data?.preferred_continents ?? serialised.preferred_continents),
      favoriteCategories: normaliseTextArray(data?.favorite_categories ?? serialised.favorite_categories),
      onboardingComplete: Boolean(data?.onboarding_complete ?? serialised.onboarding_complete),
      createdAt: data?.created_at ?? null,
      updatedAt: data?.updated_at ?? null,
    };

    try {
      const profilePayload = {
        user_id: userId,
        monthly_budget: serialised.monthly_budget,
        monthly_budget_goal: serialised.monthly_budget_goal,
        travel_interests: serialised.travel_interests,
        preferred_continents: serialised.preferred_continents,
        favorite_categories: serialised.favorite_categories,
      };

      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (profileError) {
        throw profileError;
      }
    } catch (profileUpdateError) {
      console.warn('Failed to sync personalization into user_profile', profileUpdateError);
    }

    writeLocalFallback(userId, normalised);
    return normalised;
  } catch (error) {
    console.error('Failed to persist personalization', error);
    const cached = { userId, ...payload };
    writeLocalFallback(userId, cached);
    return cached;
  }
}

export async function markOnboardingComplete(userId, payload = {}) {
  const result = await savePersonalization(userId, {
    ...payload,
    onboardingComplete: true,
  });
  return result;
}
