import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CookieConsentContextValue {
  bannerVisible: boolean;
  acceptCookies: (level: "essential" | "all") => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue>({
  bannerVisible: false,
  acceptCookies: () => {},
});

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    setBannerVisible(!localStorage.getItem("cookies-accepted"));
  }, []);

  const acceptCookies = (level: "essential" | "all") => {
    localStorage.setItem("cookies-accepted", level);
    setBannerVisible(false);
  };

  return (
    <CookieConsentContext.Provider value={{ bannerVisible, acceptCookies }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
