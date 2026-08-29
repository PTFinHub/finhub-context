// Carrega uma pagina num browser headless e relata o que aconteceu de facto.
//
//   node check.mjs <url> [--selector "css"] [--text "texto esperado"]
//                        [--shot ficheiro.png] [--wait ms] [--no-ssr]
//
// Usa o Playwright que o FinhubFront ja tem como dependencia. Corre a partir da
// raiz do repo do frontend, ou com PLAYWRIGHT_BROWSERS_PATH definido.
//
// Existe para o agente verificar o proprio trabalho em vez de perguntar ao humano
// se a pagina abriu.

import { createRequire } from 'node:module';
import path from 'node:path';

// A skill vive fora da arvore de node_modules do projecto, por isso o Node nao
// resolveria o playwright a partir daqui. Resolve-se a partir do cwd — que e a raiz
// do repo onde o comando e corrido.
let chromium;
try {
  ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright'));
} catch {
  console.error(`\n  playwright nao encontrado a partir de ${process.cwd()}`);
  console.error('  Correr a partir da raiz do FinhubFront, que o tem como dependencia.\n');
  process.exit(2);
}

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

if (!url) {
  console.error('uso: node check.mjs <url> [--selector css] [--text "..."] [--shot f.png] [--wait ms] [--no-ssr]');
  process.exit(2);
}

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'falhou'}`);
});
page.on('response', (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
});

let ssrHtml = '';
let status = null;

try {
  // O FinhubFront e SSR com Vike: o HTML que o servidor manda importa tanto como
  // o que a hidratacao produz. Guardamos os dois e comparamos.
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  status = response?.status() ?? null;
  ssrHtml = (await response?.text()) ?? '';

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const wait = Number(flag('wait'));
  if (wait) await page.waitForTimeout(wait);
} catch (err) {
  console.error(`\n  NAVEGACAO FALHOU: ${err.message}\n`);
  await browser.close();
  process.exit(1);
}

const title = await page.title();
const bodyText = await page.evaluate(() => document.body?.innerText ?? '');

const checks = [];

const selector = flag('selector');
if (selector) {
  const count = await page.locator(selector).count();
  checks.push([`selector ${selector}`, count > 0, count === 0 ? 'nao encontrado' : `${count} elemento(s)`]);
}

const expected = flag('text');
if (expected) {
  checks.push([`texto "${expected}"`, bodyText.includes(expected), bodyText.includes(expected) ? '' : 'ausente do body']);
}

// SSR: o conteudo tem de vir no HTML do servidor, nao so depois da hidratacao.
if (!has('no-ssr') && expected) {
  const inSsr = ssrHtml.includes(expected);
  checks.push([
    'texto no HTML do servidor',
    inSsr,
    inSsr ? '' : 'so aparece depois da hidratacao — quebra SSR e SEO',
  ]);
}

const shot = flag('shot');
if (shot) await page.screenshot({ path: shot, fullPage: true });

await browser.close();

// ---------- Relatorio ----------

const problems = consoleErrors.length + pageErrors.length + failedRequests.length;
const failedChecks = checks.filter(([, ok]) => !ok);

console.log(`\n  ${url}`);
console.log(`  HTTP ${status ?? '?'} · "${title || '(sem titulo)'}"\n`);

for (const [name, ok, detail] of checks) {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'}  ${name}${detail ? '  — ' + detail : ''}`);
}
if (checks.length) console.log('');

const section = (label, items) => {
  if (!items.length) return;
  console.log(`  ${label} (${items.length}):`);
  for (const item of items.slice(0, 10)) console.log(`    ${item}`);
  if (items.length > 10) console.log(`    … mais ${items.length - 10}`);
  console.log('');
};

section('erros de consola', consoleErrors);
section('excepcoes na pagina', pageErrors);
section('pedidos falhados', failedRequests);

if (shot) console.log(`  screenshot: ${shot}\n`);

if (!problems && !failedChecks.length) console.log('  Sem erros de consola, sem pedidos falhados, verificacoes passaram.\n');

process.exit(problems || failedChecks.length ? 1 : 0);
