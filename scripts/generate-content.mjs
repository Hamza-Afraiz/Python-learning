// Parses src/data/QA.md and generates one Starlight page per "Session".
// Each "### Q:" becomes an H2 so every question appears in the page's
// right-hand table of contents.  Run automatically via `npm run gen`.

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SRC = join(root, 'src', 'data', 'QA.md');
const OUT_DIR = join(root, 'src', 'content', 'docs', 'qa');
const OG_SVG = join(root, 'src', 'data', 'og.svg');
const OG_PNG = join(root, 'public', 'og.png');

/** A short, SEO-friendly blurb per session based on its first questions. */
function buildDescription(questions) {
  const topics = questions
    .slice(0, 4)
    .map((q) =>
      q
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[?.]+$/, '')
    );
  return `Plain-English answers on ${topics.join('; ')}.`.slice(0, 158);
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeYaml(s) {
  return s.replace(/"/g, '\\"');
}

/** YAML single-quoted scalar: double any single quotes. */
function yamlSingle(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/** Rough markdown → plain text for JSON-LD answer bodies. */
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // drop code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^\s*[#>|-]+\s?/gm, ' ') // headings, quotes, table pipes
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


async function clean() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const f of await readdir(OUT_DIR)) {
    if (f.endsWith('.md')) await unlink(join(OUT_DIR, f));
  }
}

async function buildOgImage() {
  try {
    const svg = await readFile(OG_SVG);
    await mkdir(dirname(OG_PNG), { recursive: true });
    await sharp(svg).png().toFile(OG_PNG);
    console.log('Generated public/og.png (1200x630)');
  } catch (e) {
    console.warn('Skipped og.png generation:', e.message);
  }
}

async function main() {
  await buildOgImage();
  const raw = await readFile(SRC, 'utf8');
  const lines = raw.split('\n');

  // Split into session blocks on top-level "## Session ..." headings.
  const sessions = [];
  let current = null;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;

    if (!inFence && /^## Session\b/.test(line)) {
      current = { heading: line.replace(/^##\s+/, '').trim(), body: [] };
      sessions.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }

  await clean();

  let order = 1;
  const indexRows = [];

  for (const s of sessions) {
    const sessionNum = (s.heading.match(/Session\s+(\d+)/i) || [])[1] || order;

    // Transform the body: demote "### Q:" / "### Session:" to H2, collect
    // question text, strip lone horizontal rules, keep code fences intact.
    const out = [];
    const questions = [];
    const faqPairs = []; // { q, aLines: [] } for FAQPage structured data
    let activePair = null;
    inFence = false;

    for (const line of s.body) {
      if (/^```/.test(line)) {
        inFence = !inFence;
        out.push(line);
        if (activePair) activePair.aLines.push(line);
        continue;
      }
      if (inFence) {
        out.push(line);
        if (activePair) activePair.aLines.push(line);
        continue;
      }

      const qMatch = line.match(/^###\s+Q:\s*(.+)$/);
      if (qMatch) {
        questions.push(qMatch[1].trim());
        out.push(`## ${qMatch[1].trim()}`);
        activePair = { q: qMatch[1].trim(), aLines: [] };
        faqPairs.push(activePair);
        continue;
      }
      const subMatch = line.match(/^###\s+Session:\s*(.+)$/);
      if (subMatch) {
        out.push(`## ${subMatch[1].trim()}`);
        activePair = null;
        continue;
      }
      // drop pure horizontal-rule separators (headings give us spacing)
      if (/^---\s*$/.test(line)) continue;

      out.push(line);
      if (activePair) activePair.aLines.push(line);
    }

    const title = s.heading.replace(/—/g, '·');
    const description = buildDescription(questions);
    const slug = `session-${sessionNum}`;

    // FAQPage JSON-LD → eligible for Google "People also ask" rich results.
    const faqEntities = faqPairs
      .map((p) => {
        const answer = toPlainText(p.aLines.join('\n'))
          .replace(/^A:\s*/, '')
          .slice(0, 600);
        return answer
          ? {
              '@type': 'Question',
              name: p.q.replace(/`/g, ''),
              acceptedAnswer: { '@type': 'Answer', text: answer },
            }
          : null;
      })
      .filter(Boolean);

    const faqJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntities,
    });

    const frontmatter = [
      '---',
      `title: "${escapeYaml(title)}"`,
      `description: "${escapeYaml(description)}"`,
      'sidebar:',
      `  label: "${escapeYaml(title)}"`,
      `  order: ${order}`,
      'head:',
      '  - tag: script',
      '    attrs:',
      '      type: application/ld+json',
      `    content: ${yamlSingle(faqJsonLd)}`,
      '---',
      '',
      `> **${questions.length} questions** in this session.`,
      '',
    ].join('\n');

    // collapse 3+ blank lines to 2
    const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    await writeFile(join(OUT_DIR, `${slug}.md`), frontmatter + body + '\n', 'utf8');
    indexRows.push({ slug, title, count: questions.length });
    order++;
  }

  console.log(`Generated ${sessions.length} Q&A pages:`);
  for (const r of indexRows) {
    console.log(`  • ${r.title}  (${r.count} questions)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
