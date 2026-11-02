"use client";

const AUTH_DAYS = 30;
const AUTH_KEY = "optimum-nodes-auth";
export const DEMO_PIN = "4826";

export type AuthSession = {
  unlockedAt: number;
  expiresAt: number;
};

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeSession(): AuthSession {
  const unlockedAt = Date.now();
  const expiresAt = unlockedAt + AUTH_DAYS * 24 * 60 * 60 * 1000;
  const session = { unlockedAt, expiresAt };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function verifyPin(pin: string): boolean {
  return pin === DEMO_PIN;
}
