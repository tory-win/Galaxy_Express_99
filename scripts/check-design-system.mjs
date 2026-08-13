import { readFile } from 'node:fs/promises'

const railCss = await readFile(new URL('../src/rail-logistics/rail-logistics.css', import.meta.url), 'utf8')
const railApp = await readFile(new URL('../src/rail-logistics/RailLogisticsApp.jsx', import.meta.url), 'utf8')
const railComponents = await readFile(new URL('../src/rail-logistics/components.jsx', import.meta.url), 'utf8')
const screenFiles = [
  'DashboardScreen.jsx',
  'RequestScreen.jsx',
  'ProposalsScreen.jsx',
  'ComparisonScreen.jsx',
  'PoolScreen.jsx',
  'DisruptionScreen.jsx',
  'ReviewScreen.jsx',
]
const screenSources = await Promise.all(screenFiles.map(async (name) => ({
  name,
  source: await readFile(new URL(`../src/rail-logistics/screens/${name}`, import.meta.url), 'utf8'),
})))

const violations = []
const cssRules = [
  ['raw color literal', /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i],
  ['feature-local color token', /--rp-/i],
  ['decorative gradient', /gradient\(/i],
]

for (const [label, pattern] of cssRules) {
  if (pattern.test(railCss)) violations.push(`rail-logistics.css: ${label}`)
}

const visibleSources = [{ name: 'RailLogisticsApp.jsx', source: railApp }, { name: 'components.jsx', source: railComponents }, ...screenSources]
for (const { name, source } of visibleSources) {
  if (/RAILPOOL AI|Icon name="spark"|시연용|가상 물량|AI가|AI로|AI에게|AI 해석/.test(source)) violations.push(`${name}: user-facing AI/demo decoration`)
}

if (!railComponents.includes("from '../design-system/index.js'")) {
  violations.push('components.jsx: Korail+ component imports missing')
}

if (violations.length) {
  console.error(`KORAIL+ design-system check failed:\n- ${violations.join('\n- ')}`)
  process.exit(1)
}

console.log('KORAIL+ design-system check passed')
