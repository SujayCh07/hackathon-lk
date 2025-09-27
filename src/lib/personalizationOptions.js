export const TRAVEL_INTEREST_OPTIONS = [
  'Foodie finds',
  'Nightlife',
  'Outdoors & nature',
  'Art & museums',
  'Coastal escapes',
  'Wellness & spa',
  'Remote work hubs',
  'Family friendly'
];

export const CONTINENT_OPTIONS = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Asia',
  'Oceania'
];

export const CATEGORY_FOCUS_OPTIONS = [
  'Groceries',
  'Rent',
  'Transport',
  'Leisure',
  'Healthcare',
  'Coworking'
];

export function normaliseSelection(value) {
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
