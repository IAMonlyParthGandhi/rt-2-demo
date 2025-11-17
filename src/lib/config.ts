export const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
export const HAS_CONVEX_BACKEND = Boolean(CONVEX_URL && CONVEX_URL.length > 0);
export const PYBULLET_API_BASE =
  (import.meta.env.VITE_PYBULLET_API_BASE as string | undefined) ?? "http://localhost:8000";

export function resolvePybulletEndpoint(path: string) {
  const normalizedBase = PYBULLET_API_BASE.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function assertBackendConfigured(featureName: string) {
  if (!HAS_CONVEX_BACKEND) {
    console.warn(
      `[rt-2-demo] Backend not configured. Skipping '${featureName}'. Set VITE_CONVEX_URL to enable it.`,
    );
  }
}
