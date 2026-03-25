export type AuthState = {
  token: string;
  username: string;
};

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("auth");
  return stored ? JSON.parse(stored) : null;
}

export function setAuth(auth: AuthState) {
  localStorage.setItem("auth", JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem("auth");
}

export function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth = getAuth();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}
