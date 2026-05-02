import { useEffect, useState } from "react";

const KEY = "takhlees_auth";
const EVT = "takhlees:auth-change";

export const getAuth = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuth = (auth) => {
  localStorage.setItem(KEY, JSON.stringify(auth));
  window.dispatchEvent(new Event(EVT));
};

export const clearAuth = () => {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
};

export const useAuth = () => {
  const [auth, setAuthState] = useState(() => getAuth());
  useEffect(() => {
    const sync = () => setAuthState(getAuth());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return auth;
};
