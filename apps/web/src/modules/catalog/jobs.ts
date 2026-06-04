import "server-only";

export {
  runCatalogRefresh,
  type CatalogRefreshResult,
  type CatalogRefreshSkippedSync
} from "./infrastructure/catalog-refresh";

export function isCatalogRefreshRequestAuthorized(
  request: Request,
  secret = process.env.CRON_SECRET
): boolean {
  if (!secret?.trim()) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
