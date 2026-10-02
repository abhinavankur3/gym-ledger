/**
 * Where the user is, inferred from their browser time zone (no question asked).
 * A time zone gives the country, not the state, so sub-regional cuisine is an
 * optional choice on the meal plan screen instead.
 */

export type CountryInfo = { code: string; name: string; cuisine: string };

const BY_TIME_ZONE: Record<string, CountryInfo> = {
  "Asia/Kolkata": { code: "IN", name: "India", cuisine: "Indian home cooking" },
  "Asia/Calcutta": { code: "IN", name: "India", cuisine: "Indian home cooking" },
  "Asia/Karachi": { code: "PK", name: "Pakistan", cuisine: "Pakistani home cooking" },
  "Asia/Dhaka": { code: "BD", name: "Bangladesh", cuisine: "Bangladeshi home cooking" },
  "Asia/Kathmandu": { code: "NP", name: "Nepal", cuisine: "Nepali home cooking" },
  "Asia/Colombo": { code: "LK", name: "Sri Lanka", cuisine: "Sri Lankan home cooking" },
  "Asia/Dubai": { code: "AE", name: "United Arab Emirates", cuisine: "Gulf and South Asian home cooking" },
  "Asia/Riyadh": { code: "SA", name: "Saudi Arabia", cuisine: "Gulf home cooking" },
  "Asia/Singapore": { code: "SG", name: "Singapore", cuisine: "Singaporean (Chinese, Malay, Indian) food" },
  "Asia/Kuala_Lumpur": { code: "MY", name: "Malaysia", cuisine: "Malaysian food" },
  "Asia/Jakarta": { code: "ID", name: "Indonesia", cuisine: "Indonesian food" },
  "Asia/Bangkok": { code: "TH", name: "Thailand", cuisine: "Thai food" },
  "Asia/Manila": { code: "PH", name: "Philippines", cuisine: "Filipino food" },
  "Asia/Tokyo": { code: "JP", name: "Japan", cuisine: "Japanese home cooking" },
  "Asia/Seoul": { code: "KR", name: "South Korea", cuisine: "Korean home cooking" },
  "Asia/Shanghai": { code: "CN", name: "China", cuisine: "Chinese home cooking" },
  "Asia/Hong_Kong": { code: "HK", name: "Hong Kong", cuisine: "Cantonese food" },
  "Europe/London": { code: "GB", name: "United Kingdom", cuisine: "British food" },
  "Europe/Dublin": { code: "IE", name: "Ireland", cuisine: "Irish food" },
  "Europe/Paris": { code: "FR", name: "France", cuisine: "French home cooking" },
  "Europe/Berlin": { code: "DE", name: "Germany", cuisine: "German food" },
  "Europe/Madrid": { code: "ES", name: "Spain", cuisine: "Spanish food" },
  "Europe/Rome": { code: "IT", name: "Italy", cuisine: "Italian home cooking" },
  "Europe/Amsterdam": { code: "NL", name: "Netherlands", cuisine: "Dutch food" },
  "Australia/Sydney": { code: "AU", name: "Australia", cuisine: "Australian food" },
  "Australia/Melbourne": { code: "AU", name: "Australia", cuisine: "Australian food" },
  "Pacific/Auckland": { code: "NZ", name: "New Zealand", cuisine: "New Zealand food" },
  "America/New_York": { code: "US", name: "United States", cuisine: "American food" },
  "America/Chicago": { code: "US", name: "United States", cuisine: "American food" },
  "America/Denver": { code: "US", name: "United States", cuisine: "American food" },
  "America/Los_Angeles": { code: "US", name: "United States", cuisine: "American food" },
  "America/Toronto": { code: "CA", name: "Canada", cuisine: "Canadian food" },
  "America/Vancouver": { code: "CA", name: "Canada", cuisine: "Canadian food" },
  "America/Mexico_City": { code: "MX", name: "Mexico", cuisine: "Mexican home cooking" },
  "America/Sao_Paulo": { code: "BR", name: "Brazil", cuisine: "Brazilian food" },
  "Africa/Lagos": { code: "NG", name: "Nigeria", cuisine: "Nigerian food" },
  "Africa/Nairobi": { code: "KE", name: "Kenya", cuisine: "Kenyan food" },
  "Africa/Johannesburg": { code: "ZA", name: "South Africa", cuisine: "South African food" },
};

export const INDIAN_REGIONS = {
  north: "North Indian",
  south: "South Indian",
  east: "East Indian",
  west: "West Indian",
} as const;
export type IndianRegion = keyof typeof INDIAN_REGIONS;

export function countryFromTimeZone(timeZone: string | null | undefined): CountryInfo | null {
  return (timeZone && BY_TIME_ZONE[timeZone]) || null;
}

/** Human description of the cuisine to plan around, used in the prompt and on screen. */
export function cuisineFor(country: CountryInfo | null, indianRegion: string | null | undefined) {
  if (country?.code === "IN" && indianRegion && indianRegion in INDIAN_REGIONS) {
    return `${INDIAN_REGIONS[indianRegion as IndianRegion]} home cooking`;
  }
  return country?.cuisine ?? "simple everyday home cooking";
}
