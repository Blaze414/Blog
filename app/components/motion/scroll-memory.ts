const scrollPositionPrefix = "snoopy-hq:scroll-position:";
const scrollRestorePrefix = "snoopy-hq:scroll-restore:";
const photoOriginKey = "snoopy-hq:photo-origin";
const historyTraversalKey = "snoopy-hq:history-traversal";

export function rememberRouteScroll(pathname: string, scrollY: number) {
  try {
    window.sessionStorage.setItem(`${scrollPositionPrefix}${pathname}`, String(Math.max(0, scrollY)));
  } catch {
    // Navigation still works when browser storage is unavailable.
  }
}

export function consumeRouteScroll(pathname: string) {
  try {
    const restoreKey = `${scrollRestorePrefix}${pathname}`;
    const routeRestoreRequested = window.sessionStorage.getItem(restoreKey) === "true";
    const historyRestoreRequested = window.sessionStorage.getItem(historyTraversalKey) === "true";
    if (!routeRestoreRequested && !historyRestoreRequested) return null;

    window.sessionStorage.removeItem(restoreKey);
    window.sessionStorage.removeItem(historyTraversalKey);
    const savedPosition = Number(window.sessionStorage.getItem(`${scrollPositionPrefix}${pathname}`));
    return Number.isFinite(savedPosition) ? Math.max(0, savedPosition) : 0;
  } catch {
    return null;
  }
}

export function requestHistoryScrollRestore() {
  try {
    window.sessionStorage.setItem(historyTraversalKey, "true");
  } catch {
    // Fall back to the normal top-of-page behavior.
  }
}

export function rememberPhotoOrigin(articleHref: string) {
  try {
    window.sessionStorage.setItem(photoOriginKey, articleHref);
  } catch {
    // The focused photo remains usable without scroll memory.
  }
}

export function requestArticleScrollRestore(articleHref: string) {
  try {
    if (window.sessionStorage.getItem(photoOriginKey) !== articleHref) return;

    window.sessionStorage.setItem(`${scrollRestorePrefix}${articleHref}`, "true");
    window.sessionStorage.removeItem(photoOriginKey);
  } catch {
    // Fall back to the normal top-of-page behavior.
  }
}
