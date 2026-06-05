import "server-only";

import {
  getPerformanceEnvironment,
  recordPerformanceMetric,
  type PerformanceActionKey,
  type PerformanceRouteKey,
  type PerformanceStageName
} from "./metrics";

export type ServerTimingContext = {
  route?: PerformanceRouteKey;
  action?: PerformanceActionKey;
  environment?: ReturnType<typeof getPerformanceEnvironment>;
};

export async function withServerTiming<T>(
  context: ServerTimingContext,
  callback: () => Promise<T>
): Promise<T> {
  return measureStage("server-total", context, callback);
}

export async function measureStage<T>(
  stage: PerformanceStageName,
  context: ServerTimingContext,
  callback: () => Promise<T>
): Promise<T> {
  const started = performance.now();

  try {
    return await callback();
  } finally {
    recordPerformanceMetric({
      action: context.action ?? "unknown",
      environment: context.environment ?? getPerformanceEnvironment(),
      name: stage,
      route: context.route ?? "unknown",
      stage,
      value: performance.now() - started
    });
  }
}
