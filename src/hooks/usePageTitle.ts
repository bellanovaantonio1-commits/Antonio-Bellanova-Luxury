import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Antonio Bellanova Luxury` : "Antonio Bellanova Luxury";
    return () => { document.title = prev; };
  }, [title]);
}
