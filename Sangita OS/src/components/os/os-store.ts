import { useSyncExternalStore } from "react";

type OSState = { paletteOpen: boolean; aiOpen: boolean };
let state: OSState = { paletteOpen: false, aiOpen: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function useOS() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snap,
    openPalette: () => { state = { ...state, paletteOpen: true }; emit(); },
    closePalette: () => { state = { ...state, paletteOpen: false }; emit(); },
    openAI: () => { state = { ...state, aiOpen: true }; emit(); },
    closeAI: () => { state = { ...state, aiOpen: false }; emit(); },
    togglePalette: () => { state = { ...state, paletteOpen: !state.paletteOpen }; emit(); },
  };
}