"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("snoopy-theme-change", onChange);
  return () => window.removeEventListener("snoopy-theme-change", onChange);
}

function currentThemeIsDark() {
  return document.documentElement.dataset.theme === "dark";
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeToTheme, currentThemeIsDark, () => false);

  const toggleTheme = () => {
    const nextDark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
    localStorage.setItem("snoopy-theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("snoopy-theme-change"));
  };

  return (
    <button className="icon-button theme-button" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} theme`} aria-pressed={dark}>
      <Sun className="theme-sun" size={19} aria-hidden="true" />
      <Moon className="theme-moon" size={19} aria-hidden="true" />
    </button>
  );
}
