#!/usr/bin/env node
/**
 * Figviz CLI — generate a diagram from the command line.
 *
 *   FIGVIZ_API_KEY=fvk_xxx npx figviz "labeled plant cell for 8th grade"
 *   npx figviz "convex lens ray diagram" --quality 2k --aspect 16:9 --out cell.png
 *
 * Get a free API key (3 credits) at https://figviz.com/settings/api
 */
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { FigvizError, type Quality, createFigviz } from './index.js';

const HELP = `figviz — generate labeled science & math diagrams

Usage:
  figviz "<prompt>" [options]

Options:
  -q, --quality <1k|2k|4k>   Resolution (default 1k; 4k costs 1.5 credits)
  -a, --aspect <ratio>       Aspect ratio, e.g. 16:9, 1:1, 4:3
  -o, --out <file>           Download the image to this path
      --json                 Print the raw JSON response
  -h, --help                 Show this help

Environment:
  FIGVIZ_API_KEY   Your fvk_ key — get one free at https://figviz.com/settings/api
  FIGVIZ_API_BASE  Override the API host (advanced)

Examples:
  figviz "labeled animal cell for 7th grade"
  figviz "titration curve, strong acid strong base" -q 2k -o titration.png
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      quality: { type: 'string', short: 'q' },
      aspect: { type: 'string', short: 'a' },
      out: { type: 'string', short: 'o' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const apiKey = process.env.FIGVIZ_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      'Error: FIGVIZ_API_KEY is not set. Get a free key (3 credits) at https://figviz.com/settings/api\n'
    );
    process.exit(1);
  }

  const prompt = positionals.join(' ');
  const figviz = createFigviz({
    apiKey,
    baseUrl: process.env.FIGVIZ_API_BASE,
  });

  try {
    const result = await figviz.generate({
      prompt,
      quality: values.quality as Quality | undefined,
      aspectRatio: values.aspect,
    });

    if (values.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    const image = result.images[0];
    if (!image) {
      process.stderr.write('No image was generated. Try rephrasing the prompt.\n');
      process.exit(1);
    }

    if (values.out) {
      const res = await fetch(image.url);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(values.out, buf);
      process.stdout.write(`Saved ${values.out}\n`);
    } else {
      process.stdout.write(`${image.url}\n`);
    }
    process.stderr.write(`Credits remaining: ${result.credits_remaining}\n`);
  } catch (err) {
    if (err instanceof FigvizError) {
      let hint = '';
      if (err.status === 402) hint = ' Buy credits at https://figviz.com/pricing.';
      else if (err.status === 401) hint = ' Check FIGVIZ_API_KEY.';
      process.stderr.write(`Error: ${err.message}${hint}\n`);
    } else {
      process.stderr.write(
        `Error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
    process.exit(1);
  }
}

main();
