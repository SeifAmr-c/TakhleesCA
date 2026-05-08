import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/* Resets the window scroll to the top on every pathname change so the
   SPA router doesn't carry over the previous page's scroll position. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
