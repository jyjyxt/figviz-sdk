/**
 * Figviz SDK — a tiny client for the Figviz API.
 *
 * Generate labeled science & math diagrams (biology, chemistry, physics, K-12
 * math, graphic organizers) from a text description.
 *
 * ```ts
 * import { createFigviz } from 'figviz';
 * const figviz = createFigviz({ apiKey: process.env.FIGVIZ_API_KEY! });
 * const { images } = await figviz.generate({ prompt: 'labeled plant cell, grade 8' });
 * console.log(images[0].url);
 * ```
 *
 * Get a free API key (3 credits) at https://figviz.com/settings/api
 */

export type Quality = '1k' | '2k' | '4k';

export interface FigvizOptions {
  /** Your API key (`fvk_…`). Get one at https://figviz.com/settings/api */
  apiKey: string;
  /** Override the API host. Default: https://figviz.com */
  baseUrl?: string;
  /** Per-request timeout in ms. Default: 300000 (5 min). */
  timeoutMs?: number;
}

export interface GenerateInput {
  /** What to draw. Be specific: subject, grade level, and required labels. */
  prompt?: string;
  /** Generate several diagrams at once (max 4). Use instead of `prompt`. */
  prompts?: string[];
  /** Resolution. `4k` costs 1.5 credits; `1k`/`2k` cost 1. Default `1k`. */
  quality?: Quality;
  /** Aspect ratio, e.g. `'16:9'`, `'1:1'`, `'4:3'`. Omit for auto. */
  aspectRatio?: string;
  /** Optional AbortSignal to cancel the request. */
  signal?: AbortSignal;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface GenerateResult {
  images: GeneratedImage[];
  credits_used: number;
  credits_remaining: number;
}

/** Thrown when the API returns a non-2xx response. */
export class FigvizError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'FigvizError';
    this.status = status;
    this.code = code;
  }
}

export class FigvizClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: FigvizOptions) {
    if (!options?.apiKey) {
      throw new Error(
        'Figviz: apiKey is required. Get a free key at https://figviz.com/settings/api'
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://figviz.com').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 300_000;
  }

  /** Generate one or more diagrams. */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const prompt = input.prompt?.trim();
    const prompts = input.prompts?.map((p) => p.trim()).filter(Boolean);
    if (!prompt && (!prompts || prompts.length === 0)) {
      throw new Error('Figviz: provide `prompt` or a non-empty `prompts` array.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    if (input.signal) {
      input.signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...(prompts && prompts.length > 0 ? { prompts } : { prompt }),
          quality: input.quality,
          aspectRatio: input.aspectRatio,
        }),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => null)) as
        | (Partial<GenerateResult> & { error?: string; code?: string })
        | null;

      if (!res.ok) {
        throw new FigvizError(
          data?.error ?? `Figviz request failed (HTTP ${res.status})`,
          res.status,
          data?.code
        );
      }

      return {
        images: data?.images ?? [],
        credits_used: data?.credits_used ?? 0,
        credits_remaining: data?.credits_remaining ?? 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Convenience factory. Equivalent to `new FigvizClient(options)`. */
export function createFigviz(options: FigvizOptions): FigvizClient {
  return new FigvizClient(options);
}
