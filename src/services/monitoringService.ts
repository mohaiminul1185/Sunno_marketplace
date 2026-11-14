/**
 * SUNNO Marketplace - Production Live Monitoring & Telemetry Service
 * Phase 28 Production Deployment & Observability Architecture
 *
 * Tracks application health, auth failures, payment errors, courier glitches,
 * Firestore access denials, and performance bottlenecks without logging PII or secrets.
 */

export type TelemetryCategory =
  | 'APP_ERROR'
  | 'AUTH_FAILURE'
  | 'PAYMENT_FAILURE'
  | 'ORDER_ERROR'
  | 'COURIER_ERROR'
  | 'FIRESTORE_PERMISSION_ERROR'
  | 'PERFORMANCE_ALERT'
  | 'SYSTEM_HEALTH';

export type SeverityLevel = 'info' | 'warn' | 'error' | 'critical';

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  category: TelemetryCategory;
  severity: SeverityLevel;
  message: string;
  context?: Record<string, any>;
  durationMs?: number;
}

export interface SystemHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptimeSeconds: number;
  environment: string;
  errorCounts: Record<TelemetryCategory, number>;
  latestEvents: TelemetryEvent[];
  performanceSummary: {
    avgRouteLoadMs: number;
    slowOperationsCount: number;
  };
}

const MAX_RING_BUFFER_SIZE = 100;
const ringBuffer: TelemetryEvent[] = [];
const startTime = Date.now();

// Sensitive parameter keywords to scrub automatically
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apikey',
  'key',
  'pin',
  'authorization',
  'cardnumber',
  'cvv',
  'mfsaccount',
  'credential',
];

/**
 * Recursively scrubs PII, secrets, and credentials from telemetry payloads
 */
export function sanitizeContext(data: any, depth = 0): any {
  if (depth > 5) return '[TRUNCATED_DEPTH]';
  if (data === null || data === undefined) return data;
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item) => sanitizeContext(item, depth + 1));
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (lower.includes('email') && typeof val === 'string' && val.includes('@')) {
        // Mask email: j***@domain.com
        const [user, domain] = val.split('@');
        sanitized[key] = `${user[0]}***@${domain}`;
      } else if (lower.includes('phone') && typeof val === 'string' && val.length > 6) {
        // Mask phone: 017****5678
        sanitized[key] = `${val.slice(0, 3)}****${val.slice(-4)}`;
      } else {
        sanitized[key] = sanitizeContext(val, depth + 1);
      }
    }
    return sanitized;
  }
  return String(data);
}

/**
 * Record a structured telemetry event
 */
export function recordTelemetryEvent(
  category: TelemetryCategory,
  message: string,
  severity: SeverityLevel = 'info',
  context?: Record<string, any>,
  durationMs?: number
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    category,
    severity,
    message,
    context: context ? sanitizeContext(context) : undefined,
    durationMs,
  };

  // Add to ring buffer (FIFO)
  ringBuffer.push(event);
  if (ringBuffer.length > MAX_RING_BUFFER_SIZE) {
    ringBuffer.shift();
  }

  // Console output structured for Cloud Logging (severity matching)
  if (severity === 'critical' || severity === 'error') {
    console.error(`[SUNNO Telemetry - ${category}]`, message, event.context || '');
  } else if (severity === 'warn') {
    console.warn(`[SUNNO Telemetry - ${category}]`, message, event.context || '');
  } else {
    // Only debug/info
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SUNNO Telemetry - ${category}]`, message);
    }
  }

  return event;
}

/**
 * Helper to record and track performance of asynchronous operations
 */
export async function trackPerformance<T>(
  operationName: string,
  category: TelemetryCategory,
  fn: () => Promise<T>,
  warningThresholdMs = 2500
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);

    if (duration > warningThresholdMs) {
      recordTelemetryEvent(
        'PERFORMANCE_ALERT',
        `Operation "${operationName}" took ${duration}ms (exceeded threshold of ${warningThresholdMs}ms)`,
        'warn',
        { operationName },
        duration
      );
    }
    return result;
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    recordTelemetryEvent(
      category,
      `Operation "${operationName}" failed after ${duration}ms: ${err?.message || String(err)}`,
      'error',
      { operationName, error: err?.message },
      duration
    );
    throw err;
  }
}

/**
 * Get recent sanitized telemetry events for live admin dashboard
 */
export function getRecentTelemetryEvents(limit = 50): TelemetryEvent[] {
  return ringBuffer.slice(-limit).reverse();
}

/**
 * Compute real-time system health summary
 */
export function getSystemHealthReport(): SystemHealthReport {
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);

  const errorCounts: Record<TelemetryCategory, number> = {
    APP_ERROR: 0,
    AUTH_FAILURE: 0,
    PAYMENT_FAILURE: 0,
    ORDER_ERROR: 0,
    COURIER_ERROR: 0,
    FIRESTORE_PERMISSION_ERROR: 0,
    PERFORMANCE_ALERT: 0,
    SYSTEM_HEALTH: 0,
  };

  let slowOpsCount = 0;
  let totalDurations = 0;
  let durationSamples = 0;

  for (const ev of ringBuffer) {
    if (errorCounts[ev.category] !== undefined) {
      errorCounts[ev.category]++;
    }
    if (ev.category === 'PERFORMANCE_ALERT') {
      slowOpsCount++;
    }
    if (typeof ev.durationMs === 'number') {
      totalDurations += ev.durationMs;
      durationSamples++;
    }
  }

  const criticalOrErrorCount = ringBuffer.filter(
    (e) => e.severity === 'critical' || e.severity === 'error'
  ).length;

  const status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' =
    criticalOrErrorCount > 15
      ? 'UNHEALTHY'
      : criticalOrErrorCount > 3
      ? 'DEGRADED'
      : 'HEALTHY';

  return {
    status,
    uptimeSeconds,
    environment: typeof process !== 'undefined' && process.env?.NODE_ENV ? process.env.NODE_ENV : 'production',
    errorCounts,
    latestEvents: ringBuffer.slice(-10).reverse(),
    performanceSummary: {
      avgRouteLoadMs: durationSamples > 0 ? Math.round(totalDurations / durationSamples) : 0,
      slowOperationsCount: slowOpsCount,
    },
  };
}

/**
 * Initialize global client monitoring and unhandled error capturing
 */
export function initClientMonitoring(): void {
  if (typeof window === 'undefined') return;

  const isBenignNoise = (msg?: string): boolean => {
    if (!msg) return true;
    const lower = msg.toLowerCase();
    return (
      lower.includes('resizeobserver') ||
      lower.includes('websocket') ||
      lower.includes('ws://') ||
      lower.includes('wss://') ||
      lower.includes('hmr') ||
      lower.includes('vite') ||
      lower.includes('aborted') ||
      lower.includes('aborterror') ||
      lower.includes('popup-closed-by-user') ||
      lower.includes('cancelled-popup-request') ||
      lower.includes('popup_closed') ||
      lower.includes('script error') ||
      lower.includes('network error')
    );
  };

  // Uncaught exceptions
  window.addEventListener('error', (event) => {
    // Ignore resource loading errors (e.g. <img> or <link> 404s)
    if (event.target && (event.target as HTMLElement).tagName) {
      return;
    }

    if (isBenignNoise(event.message)) {
      return;
    }

    recordTelemetryEvent(
      'APP_ERROR',
      event.message || 'Uncaught JavaScript Error',
      'error',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);

    if (isBenignNoise(msg)) {
      return;
    }

    recordTelemetryEvent(
      'APP_ERROR',
      `Unhandled Promise Rejection: ${msg}`,
      'error',
      {
        stack: reason instanceof Error ? reason.stack : undefined,
      }
    );
  });

  recordTelemetryEvent('SYSTEM_HEALTH', 'SUNNO Client Monitoring initialized successfully', 'info');
}

