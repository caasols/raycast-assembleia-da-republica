/**
 * Smoke test against the real openAR API. Run manually: `npm run smoke`.
 *
 * Deliberately not part of `npm test` — it needs network, and it asserts
 * against live parliamentary data that changes daily. Its job is the one unit
 * tests cannot do: catch the vendored contract in docs/openar-openapi.json
 * drifting from what the server actually returns. It drives the real client,
 * so a bug in URL building or envelope handling shows up here too.
 *
 * NOTE: this cannot run inside the remote dev containers — api.openar.pt is
 * blocked by the egress proxy (context.md §3). Run it locally.
 */
import { listVotacoes, request, BASE_URL } from "../src/lib/openar-client";
import { errorMessage, OpenArError } from "../src/lib/errors";

async function main() {
  console.log(`Smoke-testing ${BASE_URL}\n`);

  console.log("/meta — the values every dropdown is built from:");
  const meta = (await request("/meta")) as { legislaturas?: string[]; grupos?: string[] };
  console.log(`  ${meta.legislaturas?.length ?? 0} legislaturas, ${meta.grupos?.length ?? 0} grupos`);

  console.log("\n/legislaturas — the one endpoint with no envelope:");
  const legislaturas = (await request("/legislaturas")) as { id: string; dataFim: string | null }[];
  if (!Array.isArray(legislaturas)) {
    throw new Error("/legislaturas should be a bare array, not an envelope");
  }
  // dataFim === null identifies the current legislature, rather than
  // hardcoding "XVII" and going stale at the next election.
  const current = legislaturas.find((l) => l.dataFim === null);
  console.log(`  ${legislaturas.length} total, current = ${current?.id ?? "none found"}`);

  console.log("\n/votacoes — what the first command renders:");
  const votacoes = await listVotacoes({ limit: 3 });
  console.log(`  ${votacoes.total} total, showing ${votacoes.data.length}`);
  for (const v of votacoes.data) {
    // The pair, not the id alone: vote ids are unique per initiative, so
    // /votacoes/{id} needs iniciativa_id too (OPENAR-API.md §8).
    console.log(`  (${v.id}, ${v.iniciativaId}) ${v.resultado} — ${v.iniciativaTitulo.slice(0, 60)}`);
    console.log(`      a favor: ${v.aFavor.join(", ") || "—"} | contra: ${v.contra.join(", ") || "—"}`);
  }

  console.log("\nOK");
}

main().catch((e: unknown) => {
  if (e instanceof OpenArError && e.status === 404) {
    process.stderr.write("Smoke test got a 404 — check the base URL still carries its /v1 prefix.\n");
  }
  process.stderr.write(`Smoke test failed: ${errorMessage(e)}\n`);
  process.exit(1);
});
