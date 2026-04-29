export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?:   number;
  etag?:      string | null;
}

export interface FetchResult {
  text:        string;
  status:      number;
  notModified: boolean;
  etag?:       string;
}

export async function fetchWithRetry(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const { timeoutMs = 10_000, retries = 2, etag, ...init } = opts;

  const headers: Record<string, string> = {
    'User-Agent': 'Tennoplan/2.0 Worker',
    'Accept':     'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (etag) headers['If-None-Match'] = etag;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(attempt * 1_000);

    try {
      const controller = new AbortController();
      const timer      = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;

      try {
        res = await fetch(url, { ...init, headers, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (res.status === 304) {
        return { text: '', status: 304, notModified: true, etag: res.headers.get('ETag') ?? undefined };
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

      const text = await res.text();
      if (!text.trim()) throw new Error(`Empty response body from ${url}`);

      return { text, status: res.status, notModified: false, etag: res.headers.get('ETag') ?? undefined };
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
