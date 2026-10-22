// Runs the Lighthouse audit described in lighthouse/config.mjs against the production build
// (`pnpm build && pnpm preview` must be running, or set LIGHTHOUSE_URL) and writes:
//   lighthouse/reports/<page>-<profile>-<run>.{html,json}
//   lighthouse/summary.json and lighthouse/summary.md (medians, LCP/CLS/TBT, versions, environment)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { baseUrl, categories, pages, profiles, runs, targets } from '../lighthouse/config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'lighthouse')
const reportsDir = path.join(outDir, 'reports')

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function audit(url, config) {
  // A fresh profile per run: no cache, no service worker left from the previous run.
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run'] })
  try {
    const result = await lighthouse(
      url,
      { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
      config,
    )
    return { lhr: result.lhr, html: result.report[0], json: result.report[1] }
  } finally {
    await chrome.kill()
  }
}

await mkdir(reportsDir, { recursive: true })
const results = []
let lighthouseVersion = ''
let chromeVersion = ''

for (const page of pages) {
  for (const [profileName, config] of Object.entries(profiles)) {
    const samples = []
    for (let run = 1; run <= runs; run += 1) {
      const { lhr, html, json } = await audit(`${baseUrl}${page.path}`, config)
      lighthouseVersion = lhr.lighthouseVersion
      chromeVersion =
        lhr.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0] ?? lhr.environment.hostUserAgent
      const base = path.join(reportsDir, `${page.id}-${profileName}-${run}`)
      await writeFile(`${base}.html`, html)
      await writeFile(`${base}.json`, json)
      const sample = {
        scores: Object.fromEntries(
          categories.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)]),
        ),
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
      }
      samples.push(sample)
      console.log(
        `${page.id} ${profileName} #${run}`,
        sample.scores,
        `LCP ${Math.round(sample.lcp)}ms CLS ${sample.cls.toFixed(3)} TBT ${Math.round(sample.tbt)}ms`,
      )
    }
    results.push({
      page: page.id,
      path: page.path,
      profile: profileName,
      median: {
        scores: Object.fromEntries(
          categories.map((id) => [id, median(samples.map((sample) => sample.scores[id]))]),
        ),
        lcpMs: Math.round(median(samples.map((sample) => sample.lcp))),
        cls: Number(median(samples.map((sample) => sample.cls)).toFixed(3)),
        tbtMs: Math.round(median(samples.map((sample) => sample.tbt))),
      },
      samples,
    })
  }
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const environment = {
  date: new Date().toISOString(),
  url: baseUrl,
  runsPerPageAndProfile: runs,
  lighthouse: lighthouseVersion,
  chrome: chromeVersion,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model ?? 'unknown',
  build: `vite ${pkg.devDependencies.vite}, VITE_ENABLE_MOCKS=true, served by vite preview`,
}
await writeFile(
  path.join(outDir, 'summary.json'),
  JSON.stringify({ environment, targets, results }, null, 2),
)

const header =
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
const rows = results.map(
  ({ page, profile, median: m }) =>
    `| ${page} | ${profile} | ${m.scores.performance} | ${m.scores.accessibility} | ${m.scores['best-practices']} | ${m.scores.seo} | ${(m.lcpMs / 1000).toFixed(2)} s | ${m.cls} | ${m.tbtMs} ms |`,
)
const env = Object.entries(environment)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')
await writeFile(
  path.join(outDir, 'summary.md'),
  `# Lighthouse — medianas de ${runs} execuções\n\nMetas: Performance ≥ ${targets.performance}, Accessibility ≥ ${targets.accessibility}, Best Practices ≥ ${targets['best-practices']}, SEO ≥ ${targets.seo}.\n\n${header}\n${rows.join('\n')}\n\n## Ambiente\n\n${env}\n\nRelatórios HTML e JSON de cada execução em \`lighthouse/reports/\`.\n`,
)
console.log(`\nResumo em lighthouse/summary.md`)
