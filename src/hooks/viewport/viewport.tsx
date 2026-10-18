'use client';
import { useMemo, useSyncExternalStore } from 'react';

function environment(owner: Window | null | undefined): Window | null {
  return owner === undefined ? (typeof window === 'undefined' ? null : window) : owner;
}

function mediaStore(query: string, serverMatch: boolean, ownerWindow: Window | null | undefined) {
    let current = serverMatch;
    return {
      getSnapshot: () => current,
      getServerSnapshot: () => serverMatch,
      subscribe(notify: () => void) {
        const host = environment(ownerWindow);
        if (!host || typeof host.matchMedia !== 'function') return () => {};
        const media = host.matchMedia(query); let active = true;
        const update = () => {
          if (!active || current === media.matches) return;
          current = media.matches; notify();
        };
        media.addEventListener('change', update); update();
        return () => { active = false; media.removeEventListener('change', update); };
      },
    };
}

export function useMediaQuery(query: string, options?: {serverMatch?: boolean; ownerWindow?: Window | null}): boolean {
  const serverMatch = options?.serverMatch ?? false, ownerWindow = options?.ownerWindow;
  const store = useMemo(() => mediaStore(query, serverMatch, ownerWindow), [query, serverMatch, ownerWindow]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

function viewportStore(serverWidth: number | undefined, serverHeight: number | undefined, ownerWindow: Window | null | undefined) {
    const server = {width: serverWidth, height: serverHeight}; let current = server;
    return {
      getSnapshot: () => current,
      getServerSnapshot: () => server,
      subscribe(notify: () => void) {
        const host = environment(ownerWindow);
        if (!host) return () => {};
        let active = true, frame: number | null = null;
        const update = () => {
          if (!active) return;
          const width = Number.isFinite(host.innerWidth) ? host.innerWidth : undefined;
          const height = Number.isFinite(host.innerHeight) ? host.innerHeight : undefined;
          if (current.width === width && current.height === height) return;
          current = {width, height}; notify();
        };
        const resize = () => {
          if (!active || frame !== null) return;
          if (typeof host.requestAnimationFrame !== 'function') { update(); return; }
          frame = host.requestAnimationFrame(() => { frame = null; update(); });
        };
        host.addEventListener('resize', resize); update();
        return () => {
          active = false; host.removeEventListener('resize', resize);
          if (frame !== null) { host.cancelAnimationFrame(frame); frame = null; }
        };
      },
    };
}

export function useViewport(options?: {serverWidth?: number; serverHeight?: number; ownerWindow?: Window | null}): {width: number | undefined; height: number | undefined} {
  const serverWidth = options?.serverWidth, serverHeight = options?.serverHeight, ownerWindow = options?.ownerWindow;
  const store = useMemo(() => viewportStore(serverWidth, serverHeight, ownerWindow), [serverWidth, serverHeight, ownerWindow]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
