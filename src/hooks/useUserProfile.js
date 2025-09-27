import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

// --------------------
// Helpers
// --------------------
function normaliseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normaliseCity(city) {
  if (!city) return null;
  return {
    code: city.code ?? null,
    name: city.name ?? null,
    flag: city.flag ?? null,
    ppp: normaliseNumber(city.ppp),
  };
}

function normaliseCountry(country) {
  if (!country) return null;
  return {
    code: country.code ?? null,
    name: country.country ?? country.name ?? null,
  };
}

function normaliseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0);
      }
    } catch (error) {
      // fall back to comma separated parsing
    }
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

const EMPTY_ADDRESS = {
  raw: "",
  formatted: "",
  houseNumber: "",
  street: "",
  city: "",
  state: "",
};

function buildAddressString(parts) {
  const lineOne = [parts.houseNumber, parts.street]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
    .join(" ")
    .trim();

  const lineTwo = [parts.city, parts.state]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
    .join(", ")
    .trim();

  return [lineOne, lineTwo].filter((line) => line.length > 0).join("\n");
}

function normaliseStreetAddress(value) {
  if (!value) return { ...EMPTY_ADDRESS };

  let rawValue = value;
  if (typeof rawValue !== "string") {
    rawValue = String(rawValue);
  }

  const cleaned = rawValue.replace(/\r/g, "").trim();
  if (!cleaned) return { ...EMPTY_ADDRESS };

  // Attempt to parse JSON payloads from newer clients
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      const parts = {
        houseNumber: typeof parsed.houseNumber === "string" ? parsed.houseNumber.trim() : "",
        street: typeof parsed.street === "string" ? parsed.street.trim() : "",
        city: typeof parsed.city === "string" ? parsed.city.trim() : "",
        state:
          typeof parsed.state === "string"
            ? parsed.state.trim().toUpperCase()
            : "",
      };

      const formattedRaw =
        typeof parsed.formatted === "string" && parsed.formatted.trim().length > 0
          ? parsed.formatted.trim()
          : buildAddressString(parts);
      return {
        raw: cleaned,
        formatted: formattedRaw,
        ...parts,
      };
    }
  } catch (error) {
    // Fall back to parsing as a human readable string
  }

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let lineOne = lines[0] ?? "";
  let remainder = lines.slice(1).join(", ");

  if (!remainder && lineOne.includes(",")) {
    const [first, ...rest] = lineOne
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
    lineOne = first ?? "";
    remainder = rest.join(", ");
  }

  const parts = { ...EMPTY_ADDRESS };

  const numberMatch = lineOne.match(/^(?<number>[\dA-Za-z-]+)\s+(?<street>.*)$/);
  if (numberMatch?.groups) {
    parts.houseNumber = numberMatch.groups.number?.trim() ?? "";
    parts.street = numberMatch.groups.street?.trim() ?? "";
  } else {
    parts.street = lineOne.trim();
  }

  const locality = remainder || lines[1] || "";
  const localityParts = locality
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (localityParts.length === 1) {
    if (localityParts[0].length <= 3) {
      parts.state = localityParts[0].toUpperCase();
    } else {
      parts.city = localityParts[0];
    }
  } else if (localityParts.length > 1) {
    [parts.city, parts.state] = [localityParts[0], localityParts[1]?.toUpperCase() ?? ""];
  }

  const formatted = buildAddressString(parts);

  return {
    raw: cleaned,
    formatted,
    ...parts,
  };
}

function mapProfile(row) {
  if (!row) return null;
  return {
    name: row.name?.trim() || null,
    monthlyBudget: normaliseNumber(row.monthly_budget),
    monthlyBudgetGoal: normaliseNumber(row.monthly_budget_goal),
    currentCity: normaliseCity(row.current_city),
    homeCity: normaliseCity(row.home_city),
    currentCountry: normaliseCountry(row.current_country),
    homeCountry: normaliseCountry(row.home_country),
    streetAddress: normaliseStreetAddress(row.street_address),
    travelInterests: normaliseStringArray(row.travel_interests),
    preferredContinents: normaliseStringArray(row.preferred_continents),
    favoriteCategories: normaliseStringArray(row.favorite_categories),
  };
}

// --------------------
// Hook
// --------------------
export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("user_profile")
      .select(
        `
        name,
        monthly_budget,
        monthly_budget_goal,
        street_address,
        travel_interests,
        preferred_continents,
        favorite_categories,
        current_city:ppp_city!user_profile_current_city_code_fkey(code, name, flag, ppp),
        home_city:ppp_city!user_profile_home_city_code_fkey(code, name, flag, ppp),
        current_country:country_ref!user_profile_current_country_fkey(code, country),
        home_country:country_ref!user_profile_home_country_fkey(code, country)
      `
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error loading user profile:", error);
      throw error;
    }

    return mapProfile(data);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    loadProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((cause) => {
        if (cancelled) return;
        const normalisedError =
          cause instanceof Error
            ? cause
            : new Error(typeof cause === "string" ? cause : "Failed to load profile");
        setError(normalisedError);
        setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, loadProfile]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError(null);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await loadProfile();
      setProfile(result);
      return result;
    } catch (cause) {
      const normalisedError =
        cause instanceof Error
          ? cause
          : new Error(typeof cause === "string" ? cause : "Failed to refresh profile");
      setError(normalisedError);
      setProfile(null);
      throw normalisedError;
    } finally {
      setLoading(false);
    }
  }, [loadProfile, userId]);

  return { profile, loading, error, refresh };
}

export default useUserProfile;
