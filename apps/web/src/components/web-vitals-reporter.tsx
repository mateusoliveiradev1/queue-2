"use client";

import { useCallback } from "react";
import { useReportWebVitals } from "next/web-vitals";

const webVitalsEndpoint = "/api/performance/web-vitals";
const reportedMetricNames = new Set(["TTFB", "FCP", "LCP", "INP", "CLS"]);

export function WebVitalsReporter() {
  const reportMetric = useCallback((metric: { name: string; rating?: string; value: number }) => {
    if (!reportedMetricNames.has(metric.name)) {
      return;
    }

    const payload = JSON.stringify({
      name: metric.name,
      navigationType: getNavigationType(),
      rating: metric.rating ?? "unknown",
      route: window.location.pathname,
      value: metric.value
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        webVitalsEndpoint,
        new Blob([payload], { type: "application/json" })
      );

      if (sent) {
        return;
      }
    }

    void fetch(webVitalsEndpoint, {
      body: payload,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true,
      method: "POST"
    });
  }, []);

  useReportWebVitals(reportMetric);

  return null;
}

function getNavigationType(): string {
  const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return navigation?.type ?? "unknown";
}
