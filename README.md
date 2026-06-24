# figviz

Official SDK + CLI for [Figviz](https://figviz.com) — generate clear, **labeled
science & math diagrams** (biology, chemistry, physics, K-12 math, graphic
organizers) from a text description.

## Get an API key

Create a free key (includes 3 credits) at **https://figviz.com/settings/api**.
Figviz is pay-as-you-go — no subscription, credits never expire.

## CLI

```bash
# one-off, no install
FIGVIZ_API_KEY=fvk_xxx npx figviz "labeled plant cell for 8th grade"

# save to a file, pick resolution + aspect ratio
npx figviz "convex lens ray diagram" --quality 2k --aspect 16:9 --out lens.png
```

Options: `-q/--quality 1k|2k|4k`, `-a/--aspect <ratio>`, `-o/--out <file>`,
`--json`, `-h/--help`.

## SDK

```bash
npm install @figviz/figviz-sdk
```

```ts
import { createFigviz } from '@figviz/figviz-sdk';

const figviz = createFigviz({ apiKey: process.env.FIGVIZ_API_KEY! });

const { images, credits_remaining } = await figviz.generate({
  prompt: 'labeled animal cell cross-section for 7th grade',
  quality: '2k',        // '1k' | '2k' | '4k' (4k costs 1.5 credits)
  aspectRatio: '4:3',   // optional
});

console.log(images[0].url, `(${credits_remaining} credits left)`);
```

Batch (up to 4 at once):

```ts
await figviz.generate({ prompts: ['water cycle diagram', 'nitrogen cycle diagram'] });
```

Errors throw `FigvizError` with `.status` and `.code` (e.g. `402` =
insufficient credits — top up at https://figviz.com/pricing).

## Requirements

Node.js 18+ (uses the built-in `fetch`). Zero runtime dependencies.

## Also available

- **MCP server** for Claude Desktop / Cursor / Cline: [`figviz-mcp`](https://www.npmjs.com/package/figviz-mcp)

## License

MIT
