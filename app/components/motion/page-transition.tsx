"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { consumeRouteScroll, rememberRouteScroll, requestHistoryScrollRestore } from "./scroll-memory";

function RouteScrollManager({ pathname }: { pathname: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    const nextScrollPosition = consumeRouteScroll(pathname);

    root.style.scrollBehavior = "auto";
    const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
    if (nextScrollPosition !== null) window.scrollTo(0, nextScrollPosition);
    else if (hashTarget instanceof HTMLElement) hashTarget.scrollIntoView();
    else window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;

    return () => {
      rememberRouteScroll(pathname, window.scrollY);
    };
  }, [pathname]);

  return null;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    const handleHistoryTraversal = () => requestHistoryScrollRestore();
    window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", handleHistoryTraversal);

    return () => {
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("popstate", handleHistoryTraversal);
    };
  }, []);

  return (
    <motion.div
      className="page-transition-shell"
      key={pathname}
      initial={reduceMotion ? false : { opacity: 0.96 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      <RouteScrollManager pathname={pathname} />
      {children}
    </motion.div>
  );
}
