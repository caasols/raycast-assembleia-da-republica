/**
 * Smoke test against the real openAR API. Run manually: `npm run smoke`.
 *
 * Deliberately not part of `npm test` — it needs network, and it asserts
 * against live parliamentary data that changes daily. Its job is to catch the
 * class of breakage unit tests cannot see: the contract in
 * docs/openar-openapi.json drifting from what the server actually returns.
 *
 * NOTE: this cannot run inside the remote dev containers — api.openar.pt is
 * blocked by the egress proxy (context.md §3). Run it locally.
 */
import { errorMessage } from "../src/lib/errors";

// The `/v1` is load-bearing: it lives in the spec's servers[0].url, not in the
// documented paths, so the bare host 404s everything (context.md D19).
const BASE_URL = process.env.OPENAR_BASE_URL ?? "https://api.openar.pt/v1";

async function get(path: string): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url);
  // Surfaced rather than thrown away: a 404 here almost certainly means the
  // base URL lost its /v1, and that is worth saying out loud.
  if (!response.ok) {
    throw new Error(`GET ${url} → ${response.status} ${response.statusText}`);
  }
  const remaining = response.headers.get("X-RateLimit-Remaining");
  console.log(`  ${path} → ${response.status}${remaining ? ` (${remaining} requests left this minute)` : ""}`);
  return response.json();
}

async function main() {
  console.log(`Smoke-testing ${BASE_URL}\n`);

  console.log("meta — the values every dropdown is built from:");
  const meta = (await get("/meta")) as { legislaturas?: string[]; grupos?: string[]; estados?: string[] };
  console.log(`  ${meta.legislaturas?.length ?? 0} legislaturas, ${meta.grupos?.length ?? 0} grupos`);

  console.log("\nlegislaturas — the one endpoint with no envelope:");
  const legislaturas = (await get("/legislaturas")) as { id: string; dataFim: string | null }[];
  if (!Array.isArray(legislaturas)) {
    throw new Error("/legislaturas should be a bare array, not an envelope");
  }
  // dataFim === null is how the current legislature is identified, rather than
  // hardcoding "XVII" and going stale at the next election.
  const current = legislaturas.find((l) => l.dataFim === null);
  console.log(`  ${legislaturas.length} total, current = ${current?.id ?? "none found"}`);

  console.log("\nvotacoes — what the first command renders:");
  const votacoes = (await get("/votacoes?limit=3")) as {
    data?: { id: string; iniciativaId: number; resultado: string; iniciativaTitulo: string }[];
    total?: number;
  };
  console.log(`  ${votacoes.total ?? 0} total`);
  for (const v of votacoes.data ?? []) {
    // The pair, not the id alone: vote ids are unique per initiative, so
    // /votacoes/{id} needs iniciativa_id too (OPENAR-API.md §8).
    console.log(`  (${v.id}, ${v.iniciativaId}) ${v.resultado} — ${v.iniciativaTitulo.slice(0, 60)}`);
  }

  console.log("\nOK");
}

main().catch((e: unknown) => {
  process.stderr.write(`Smoke test failed: ${errorMessage(e)}\n`);
  process.exit(1);
});
