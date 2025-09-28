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

function fromAddressObject(payload) {
  if (!payload || typeof payload !== "object") return null;

  const parts = {
    houseNumber:
      typeof payload.houseNumber === "string"
        ? payload.houseNumber.trim()
        : typeof payload.house_number === "string"
        ? payload.house_number.trim()
        : "",
    street: typeof payload.street === "string" ? payload.street.trim() : "",
    city: typeof payload.city === "string" ? payload.city.trim() : "",
    state:
      typeof payload.state === "string"
        ? payload.state.trim().toUpperCase()
        : typeof payload.region === "string"
        ? payload.region.trim().toUpperCase()
        : "",
  };

  const formatted =
    typeof payload.formatted === "string" && payload.formatted.trim().length > 0
      ? payload.formatted.trim()
      : buildAddressString(parts);

  const rawValue =
    typeof payload.raw === "string" && payload.raw.trim().length > 0
      ? payload.raw.trim()
      : JSON.stringify({ ...parts, formatted });

  return {
    raw: rawValue,
    formatted,
    ...parts,
  };
}

function normaliseStreetAddress(value) {
  if (!value) return { ...EMPTY_ADDRESS };

  if (typeof value === "object") {
    const fromObject = fromAddressObject(value);
    if (fromObject) return fromObject;
  }

  let rawValue = value;
  if (typeof rawValue !== "string") {
    rawValue = String(rawValue);
  }

  const cleaned = rawValue.replace(/\r/g, "").trim();
  if (!cleaned) return { ...EMPTY_ADDRESS };

  // Attempt to parse JSON payloads from newer clients
  try {
    const parsed = JSON.parse(cleaned);
    const fromObject = fromAddressObject(parsed);
    if (fromObject) {
      return {
        ...fromObject,
        raw: cleaned,
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

  const monthlyBudget = normaliseNumber(row.monthly_budget);
  const streetAddress = normaliseStreetAddress(row.street_address);
  const streetAddressRaw =
    typeof row.street_address === "string"
      ? row.street_address
      : row.street_address && typeof row.street_address === "object"
      ? JSON.stringify(row.street_address)
      : null;
  const currentCountryCode =
    typeof row.current_country_code === "string"
      ? row.current_country_code.trim().toUpperCase()
      : "";
  const homeCountryCode =
    typeof row.home_country_code === "string"
      ? row.home_country_code.trim().toUpperCase()
      : "";
  const currentCityCode =
    typeof row.current_city_code === "string"
      ? row.current_city_code.trim().toUpperCase()
      : "";
  const homeCityCode =
    typeof row.home_city_code === "string"
      ? row.home_city_code.trim().toUpperCase()
      : "";

  return {
    name: typeof row.name === "string" ? row.name : "",
    monthlyBudget,
    streetAddress,
    streetAddressRaw,
    currentCountryCode,
    homeCountryCode,
    currentCityCode,
    homeCityCode,
    currentCity: normaliseCity(row.current_city),
    homeCity: normaliseCity(row.home_city),
    currentCountry: normaliseCountry(row.current_country),
    homeCountry: normaliseCountry(row.home_country),
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
        street_address,
        current_country_code,
        home_country_code,
        current_city_code,
        home_city_code,
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
