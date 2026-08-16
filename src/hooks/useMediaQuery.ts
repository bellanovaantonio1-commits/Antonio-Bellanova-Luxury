import { useEffect, useState } from "react";

/** Matches Tailwind `lg` — phones & tablets use mobile layout, laptops/desktops use desktop layout. */
export const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** True on phones and tablets (< 1024px). */
export function useIsMobileLayout(): boolean {
  return !useMediaQuery(DESKTOP_MEDIA_QUERY);
}

/** True on laptops and desktops (>= 1024px). */
export function useIsDesktopLayout(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY);
}
