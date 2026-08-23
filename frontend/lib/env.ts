import "server-only";

export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function backendApiUrl(): string {
  return (process.env.BACKEND_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
}
