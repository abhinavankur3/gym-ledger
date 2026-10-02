import { cookies } from "next/headers";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_COOKIE = "theme";

export async function getThemePreference(): Promise<ThemePreference> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" || value === "system" ? value : "dark";
}

/** Persists the preference for the root layout. Call from server actions only. */
export async function setThemeCookie(theme: ThemePreference) {
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/**
 * Runs before paint when the preference is "system": applies .dark/.light from the
 * OS setting and follows changes, so there's no flash of the wrong theme.
 */
export const SYSTEM_THEME_SCRIPT = `(()=>{const m=matchMedia("(prefers-color-scheme: dark)");const a=()=>{const d=document.documentElement;d.classList.toggle("dark",m.matches);d.classList.toggle("light",!m.matches)};a();m.addEventListener("change",a)})()`;
