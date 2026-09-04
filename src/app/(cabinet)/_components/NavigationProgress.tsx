"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Controls that navigate by assigning `location` instead of following an `<a>` (the Order List
 * filter selects, via `useOrdersUrl`) announce themselves with this event, so they get the same
 * feedback as a link click without this component and that hook sharing React state.
 */
export const NAVIGATION_START_EVENT = "app:navigation-start";

/** A bar that never clears is worse than no bar. If nothing committed by then, assume the
 * navigation never happened — a refused link, a cancelled request, a download. */
const MAX_VISIBLE_MS = 10_000;

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Whether this anchor actually replaces the current document — i.e. whether there is a wait worth
 * covering. Downloads and `/api/*` responses leave the page where it is. */
function startsAPageTransition(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  // Export CSV points at /api/orders/export — a file download, not a screen change.
  if (url.pathname.startsWith("/api/")) return false;
  // A bare hash link scrolls, it does not navigate.
  if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return false;

  return true;
}

/**
 * Indeterminate progress bar for the gap between "user clicked" and "next screen paints".
 *
 * Why this exists rather than more `loading.tsx` files: the tabs, pagination, view switch and
 * granularity switch are deliberately plain `<a>` full page loads (see OrdersTabs for the
 * evidence), and a full load leaves the *old* page on screen until the server answers. A route
 * skeleton renders only after that response arrives, which is already the end of the wait, so it
 * covers nothing. This starts on the click itself, in the outgoing document, and dies with it.
 *
 * For client-side `<Link>` navigation it overlaps with the route skeletons, which is fine — the
 * bar clears as soon as `pathname` changes.
 */
export function NavigationProgress() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // A committed client-side navigation ends the wait. A full navigation never gets here: that
  // document is replaced outright, and the new one mounts with `visible` back to false.
  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!isPlainLeftClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return;
      if (!startsAPageTransition(anchor)) return;
      setVisible(true);
    }

    function onNavigationStart() {
      setVisible(true);
    }

    // Coming back via the bfcache restores this document with the bar still showing.
    function onPageShow() {
      setVisible(false);
    }

    // Capture phase: run before Link's own handler, so the bar is up regardless of what it does.
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATION_START_EVENT, onNavigationStart);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATION_START_EVENT, onNavigationStart);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-border/40"
    >
      <div className="h-full w-1/3 animate-nav-progress rounded-full bg-blue" />
    </div>
  );
}
