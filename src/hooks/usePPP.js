import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPurchasingPowerRatio,
  getAdjustedPrice,
  calculateBudgetRunway,
  getAllCountries,
} from '../Econ.js';

// --- Dictionary of countries → capital cities ---
const capitals = {
  "aruba": "Oranjestad",
  "afghanistan": "Kabul",
  "angola": "Luanda",
  "albania": "Tirana",
  "andorra": "Andorra la Vella",
  "united arab emirates": "Abu Dhabi",
  "argentina": "Buenos Aires",
  "armenia": "Yerevan",
  "antigua and barbuda": "Saint John's",
  "australia": "Canberra",
  "austria": "Vienna",
  "azerbaijan": "Baku",
  "burundi": "Gitega",
  "belgium": "Brussels",
  "benin": "Porto-Novo",
  "burkina faso": "Ouagadougou",
  "bangladesh": "Dhaka",
  "bulgaria": "Sofia",
  "bahrain": "Manama",
  "bahamas, the": "Nassau",
  "bosnia and herzegovina": "Sarajevo",
  "belarus": "Minsk",
  "belize": "Belmopan",
  "bolivia": "Sucre",
  "brazil": "Brasília",
  "barbados": "Bridgetown",
  "brunei darussalam": "Bandar Seri Begawan",
  "bhutan": "Thimphu",
  "botswana": "Gaborone",
  "central african republic": "Bangui",
  "canada": "Ottawa",
  "switzerland": "Bern",
  "chile": "Santiago",
  "cameroon": "Yaoundé",
  "colombia": "Bogotá",
  "comoros": "Moroni",
  "cabo verde": "Praia",
  "costa rica": "San José",
  "cyprus": "Nicosia",
  "germany": "Berlin",
  "djibouti": "Djibouti",
  "dominica": "Roseau",
  "denmark": "Copenhagen",
  "dominican republic": "Santo Domingo",
  "algeria": "Algiers",
  "ecuador": "Quito",
  "spain": "Madrid",
  "estonia": "Tallinn",
  "ethiopia": "Addis Ababa",
  "finland": "Helsinki",
  "fiji": "Suva",
  "france": "Paris",
  "gabon": "Libreville",
  "united kingdom": "London",
  "georgia": "Tbilisi",
  "ghana": "Accra",
  "guinea": "Conakry",
  "gambia, the": "Banjul",
  "guinea-bissau": "Bissau",
  "equatorial guinea": "Malabo",
  "greece": "Athens",
  "grenada": "St. George's",
  "guatemala": "Guatemala City",
  "guyana": "Georgetown",
  "honduras": "Tegucigalpa",
  "croatia": "Zagreb",
  "haiti": "Port-au-Prince",
  "hungary": "Budapest",
  "indonesia": "Jakarta",
  "india": "New Delhi",
  "ireland": "Dublin",
  "iraq": "Baghdad",
  "iceland": "Reykjavik",
  "israel": "Jerusalem",
  "italy": "Rome",
  "jamaica": "Kingston",
  "jordan": "Amman",
  "japan": "Tokyo",
  "kazakhstan": "Astana",
  "kenya": "Nairobi",
  "kyrgyz republic": "Bishkek",
  "cambodia": "Phnom Penh",
  "kiribati": "South Tarawa",
  "kuwait": "Kuwait City",
  "lebanon": "Beirut",
  "liberia": "Monrovia",
  "libya": "Tripoli",
  "sri lanka": "Sri Jayawardenepura Kotte",
  "lesotho": "Maseru",
  "lithuania": "Vilnius",
  "luxembourg": "Luxembourg",
  "latvia": "Riga",
  "morocco": "Rabat",
  "moldova": "Chișinău",
  "madagascar": "Antananarivo",
  "maldives": "Malé",
  "mexico": "Mexico City",
  "marshall islands": "Majuro",
  "mali": "Bamako",
  "malta": "Valletta",
  "myanmar": "Naypyidaw",
  "montenegro": "Podgorica",
  "mongolia": "Ulaanbaatar",
  "mozambique": "Maputo",
  "mauritania": "Nouakchott",
  "mauritius": "Port Louis",
  "malawi": "Lilongwe",
  "malaysia": "Kuala Lumpur",
  "namibia": "Windhoek",
  "niger": "Niamey",
  "nigeria": "Abuja",
  "nicaragua": "Managua",
  "netherlands": "Amsterdam",
  "norway": "Oslo",
  "nepal": "Kathmandu",
  "nauru": "Yaren District",
  "new zealand": "Wellington",
  "oman": "Muscat",
  "pakistan": "Islamabad",
  "panama": "Panama City",
  "peru": "Lima",
  "philippines": "Manila",
  "palau": "Ngerulmud",
  "papua new guinea": "Port Moresby",
  "poland": "Warsaw",
  "portugal": "Lisbon",
  "paraguay": "Asunción",
  "west bank and gaza": "Ramallah",
  "qatar": "Doha",
  "romania": "Bucharest",
  "russian federation": "Moscow",
  "rwanda": "Kigali",
  "saudi arabia": "Riyadh",
  "sudan": "Khartoum",
  "senegal": "Dakar",
  "singapore": "Singapore",
  "solomon islands": "Honiara",
  "sierra leone": "Freetown",
  "el salvador": "San Salvador",
  "san marino": "San Marino",
  "somalia": "Mogadishu",
  "serbia": "Belgrade",
  "suriname": "Paramaribo",
  "slovak republic": "Bratislava",
  "slovenia": "Ljubljana",
  "sweden": "Stockholm",
  "eswatini": "Mbabane",
  "seychelles": "Victoria",
  "chad": "N'Djamena",
  "togo": "Lomé",
  "thailand": "Bangkok",
  "tajikistan": "Dushanbe",
  "turkmenistan": "Ashgabat",
  "timor-leste": "Dili",
  "tonga": "Nukuʻalofa",
  "trinidad and tobago": "Port of Spain",
  "tunisia": "Tunis",
  "tuvalu": "Funafuti",
  "tanzania": "Dodoma",
  "uganda": "Kampala",
  "ukraine": "Kyiv",
  "uruguay": "Montevideo",
  "united states": "Washington, D.C.",
  "uzbekistan": "Tashkent",
  "vanuatu": "Port Vila",
  "samoa": "Apia",
  "kosovo": "Pristina",
  "south africa": "Pretoria",
  "zambia": "Lusaka",
  "zimbabwe": "Harare"
};

// --- Fetch real monthly cost of living (USD) from Numbeo ---
async function fetchMonthlyLivingCost(cityName) {
  try {
    const url = `https://www.numbeo.com/api/city_prices?api_key=${
      import.meta.env.VITE_NUMBEO_KEY
    }&query=${encodeURIComponent(cityName)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Bad response for ${cityName}`);

    const data = await response.json();

    if (!data?.prices || !Array.isArray(data.prices)) {
      console.warn(`No prices found for ${cityName}, fallback=2000`);
      return 2000;
    }

    // Example aggregation: rent + groceries + restaurants
    const rent = data.prices.find((p) => p.item_id === 8)?.average_price ?? 800;
    const food = data.prices.find((p) => p.item_id === 1)?.average_price ?? 300;
    const restaurant = data.prices.find((p) => p.item_id === 13)?.average_price ?? 200;

    const monthly = rent + food + restaurant * 10 + 400;

    return Math.max(150, Math.min(8000, Math.round(monthly)));
  } catch (err) {
    console.error('fetchMonthlyLivingCost failed for', cityName, err);
    return 2000;
  }
}

// --- Hook ---
export function usePPP() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const countriesWithPPP = await getAllCountries();
        if (!active) return;

        const transformed = await Promise.all(
          (countriesWithPPP ?? []).map(async (country) => {
            const key = country.originalName.toLowerCase();
            const queryCity = capitals[key] ?? country.originalName;
            const monthlyCost = await fetchMonthlyLivingCost(queryCity);

            return {
              city: queryCity,
              country: country.originalName,
              normalizedName: country.normalizedName,
              ppp: country.pppIndex,
              monthlyCost,
              currency: 'USD',
              code: country.isoCode ?? null,
            };
          })
        );

        setCountries(transformed);
        setError(null);
      } catch (cause) {
        if (!active) return;
        console.error('usePPP: failed to load PPP data', cause);
        setCountries([]);
        setError(cause instanceof Error ? cause : new Error('Unable to load PPP data'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => countries, [countries]);

  const adjustPrice = useCallback(async (amountUSD, fromCountry, toCountry) => {
    try {
      const result = await getAdjustedPrice(amountUSD, fromCountry, toCountry);
      return typeof result === 'number' ? result : amountUSD;
    } catch {
      return amountUSD;
    }
  }, []);

  const calculateRunway = useCallback(
    async (monthlyBudgetUSD, _fromCountry, _toCountry, monthlyCostUSD) => {
      if (!monthlyCostUSD || monthlyCostUSD <= 0) return 0;
      return monthlyBudgetUSD / monthlyCostUSD;
    },
    []
  );

  const getPPPRatio = useCallback(async (fromCountry, toCountry) => {
    try {
      const result = await getPurchasingPowerRatio(fromCountry, toCountry);
      return typeof result === 'number' ? result : null;
    } catch {
      return null;
    }
  }, []);

  const rankedBySavings = useMemo(() => {
    if (countries.length === 0) return [];
    const baselineCountry = countries.find((entry) => {
      const lower = entry.normalizedName?.toLowerCase?.() ?? entry.city?.toLowerCase?.() ?? '';
      return lower.includes('united states') || lower === 'usa';
    });
    const baselinePPP = baselineCountry?.ppp ?? 1;

    return countries
      .map((country) => {
        const savings = ((baselinePPP - country.ppp) / baselinePPP) * 100;
        return {
          ...country,
          savings: Number.parseFloat(savings.toFixed(2)),
        };
      })
      .sort((a, b) => b.savings - a.savings);
  }, [countries]);

  return {
    ppp: countries.reduce((acc, country) => {
      acc[country.country] = { ppp: country.ppp };
      return acc;
    }, {}),
    cities,
    countries,
    adjustPrice,
    calculateRunway,
    getPPPRatio,
    rankedBySavings,
    isLoading,
    error,
  };
}

export default usePPP;
