/**
 * Smoke test against the real openAR API. Run manually: `npm run smoke`.
 *
 * Deliberately not part of `npm test` — it needs network, and it asserts
 * against live parliamentary data that changes daily. Its job is the one unit
 * tests cannot do: catch the published contract at api.openar.pt/openapi.json
 * drifting from what the server actually returns. It drives the real client
 * through every endpoint the extension uses, so a bug in URL building or
 * envelope handling shows up here too.
 *
 * Steps run to completion rather than failing fast: the point of this script
 * is one networked session producing the full picture, and the first broken
 * endpoint must not hide the state of the other twelve. A step whose
 * prerequisite failed is skipped with a reason; any failure exits 1.
 *
 * NOTE: this cannot run inside the remote dev containers — api.openar.pt is
 * blocked by the egress proxy (context.md §3 K1). Run it locally.
 */
import {
  BASE_URL,
  currentLegislature,
  getComissao,
  getDeputado,
  getDeputadoAtividade,
  getIniciativa,
  getMeta,
  getPeticao,
  listCarreiras,
  listComissoes,
  listDeputados,
  listIniciativas,
  listLegislaturas,
  listPeticoes,
  listVotacoes,
} from "../src/lib/openar-client";
import { activityCounts } from "../src/lib/activity";
import { errorMessage, OpenArError } from "../src/lib/errors";

// Every request's status is logged by wrapping fetch, because the one thing
// the client deliberately hides is the thing this script must show: whether
// the second fetch of an ETag endpoint really came back 304.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  const response = await realFetch(...args);
  console.log(`    → ${response.status} ${String(args[0]).replace(BASE_URL, "")}`);
  return response;
}) as typeof fetch;

const failures: string[] = [];

async function step<T>(title: string, fn: () => Promise<T>): Promise<T | undefined> {
  console.log(`\n${title}`);
  try {
    return await fn();
  } catch (e) {
    // A 404 here has one overwhelmingly likely cause, worth naming inline.
    const hint = e instanceof OpenArError && e.status === 404 ? " (is the /v1 prefix missing?)" : "";
    console.error(`  FAILED: ${errorMessage(e)}${hint}`);
    failures.push(`${title}: ${errorMessage(e)}`);
    return undefined;
  }
}

function skip(title: string, reason: string): void {
  console.log(`\n${title}\n  skipped: ${reason}`);
}

async function main() {
  console.log(`Smoke-testing ${BASE_URL}`);

  await step("/meta — the values every dropdown is built from", async () => {
    const meta = await getMeta();
    console.log(`  ${meta.legislaturas.length} legislaturas, ${meta.grupos.length} grupos, ${meta.tipos.length} tipos`);
  });

  const current = await step("/legislaturas — the one endpoint with no envelope", async () => {
    const legislaturas = await listLegislaturas();
    // dataFim === null identifies the current legislature, rather than
    // hardcoding "XVII" and going stale at the next election.
    const found = currentLegislature(legislaturas);
    console.log(`  ${legislaturas.length} total, current = ${found?.id ?? "none found"}`);
    return found;
  });

  await step("/votacoes — what the first command renders, plus page arithmetic", async () => {
    const page1 = await listVotacoes({ limit: 3, page: 1 });
    console.log(`  ${page1.total} total, showing ${page1.data.length}`);
    for (const v of page1.data) {
      // The pair, not the id alone: vote ids are unique per initiative, so
      // /votacoes/{id} needs iniciativa_id too (OPENAR-API.md §8).
      console.log(`  (${v.id}, ${v.iniciativaId}) ${v.resultado} — ${v.iniciativaTitulo.slice(0, 60)}`);
      console.log(`      a favor: ${v.aFavor.join(", ") || "—"} | contra: ${v.contra.join(", ") || "—"}`);
    }
    // openAR clamps page 0 up to 1, so a broken page conversion shows as two
    // identical pages rather than an error — check the pages actually differ.
    const page2 = await listVotacoes({ limit: 3, page: 2 });
    const key = (v: { id: string; iniciativaId: number }) => `${v.iniciativaId}:${v.id}`;
    if (page2.data[0] && page1.data[0] && key(page2.data[0]) === key(page1.data[0])) {
      throw new Error("page 2 returned the same first row as page 1 — page arithmetic is off");
    }
    console.log(`  page 2 differs from page 1 — pagination arithmetic holds`);
  });

  const iniciativas = await step("/iniciativas — server-side title search", async () => {
    const result = await listIniciativas({ q: "lei", limit: 3 });
    console.log(`  ${result.total} match "lei", showing ${result.data.length}`);
    return result;
  });

  const firstIniciativa = iniciativas?.data[0];
  if (firstIniciativa) {
    await step(`/iniciativas/${firstIniciativa.id} — detail, then revalidation`, async () => {
      const detail = await getIniciativa(firstIniciativa.id);
      console.log(`  "${detail.titulo.slice(0, 60)}" — ${detail.eventos?.length ?? 0} eventos`);
      // Second fetch should log 304 above: this endpoint sends a weak ETag and
      // the client replays it as If-None-Match (D81). A 200 here means the
      // server stopped honouring revalidation — worth knowing, not fatal.
      await getIniciativa(firstIniciativa.id);
      console.log(`  fetched twice — a 304 on the second line above means ETag revalidation works end to end`);
    });
  } else {
    skip("/iniciativas/{id}", "no initiative id — the list step failed");
  }

  const peticoes = await step("/peticoes — the petitions list", async () => {
    const result = await listPeticoes({ limit: 3 });
    console.log(`  ${result.total} total, showing ${result.data.length}`);
    return result;
  });

  const firstPeticao = peticoes?.data[0];
  if (firstPeticao) {
    await step(`/peticoes/${firstPeticao.id} — detail, then revalidation`, async () => {
      const detail = await getPeticao(firstPeticao.id);
      console.log(`  "${(detail.assunto ?? "untitled").slice(0, 60)}" — ${detail.assinaturas ?? "?"} signatures`);
      // The second of the two ETag endpoints (D81) — same 304 check as above.
      await getPeticao(firstPeticao.id);
      console.log(`  fetched twice — a 304 on the second line above means ETag revalidation works end to end`);
    });
  } else {
    skip("/peticoes/{id}", "no petition id — the list step failed");
  }

  // `situacao=ativo` alone matches every seat ever held (2,306 rows when first
  // run); only with the current legislature does it mean the sitting members.
  // The first run printed that 2,306 under "expect 230" and passed, so the
  // count is now asserted rather than printed.
  let firstDeputado: { id: number } | undefined;
  if (current) {
    const deputados = await step("/deputados — the sitting members", async () => {
      const result = await listDeputados({ legislatura: current.id, situacao: "ativo", limit: 3 });
      console.log(`  ${result.total} sitting in ${current.id}, showing ${result.data.length}`);
      if (result.total !== 230) {
        throw new Error(`expected the 230 sitting seats, got ${result.total}`);
      }
      return result;
    });
    firstDeputado = deputados?.data[0];
  } else {
    skip("/deputados", "no current legislature — the /legislaturas step failed");
  }

  if (firstDeputado) {
    await step(`/deputados/${firstDeputado.id} — one deputy's full record`, async () => {
      const detail = await getDeputado(firstDeputado.id);
      console.log(
        `  ${detail.nomeParlamentar} — ${detail.mandatos.length} mandatos, ${detail.iniciativas.length} recent initiatives`,
      );
      // A sitting deputy holds at least the current mandate. Zero means the
      // relations were not returned: openAR drops them when `include` is
      // missing, and the client defaults them to [], so nothing else errors.
      if (detail.mandatos.length === 0) {
        throw new Error("a sitting deputy came back with no mandates — is include being sent?");
      }
    });
  } else {
    skip("/deputados/{id}", "no deputy id — the list step failed");
  }

  const carreiras = await step("/deputados/carreiras — the longevity ranking", async () => {
    const result = await listCarreiras(3);
    for (const c of result.data) {
      console.log(`  ${c.nomeParlamentar} — ${c.totalLegs} legislatures (${c.lastParty ?? "?"})`);
    }
    return result;
  });

  const veteran = carreiras?.data[0];
  if (veteran) {
    await step(`/deputados/${veteran.id}/atividade — whole career, and the actp question`, async () => {
      const activity = await getDeputadoAtividade(veteran.id);
      for (const entry of activityCounts(activity)) {
        console.log(`  ${entry.count} ${entry.label.toLowerCase()}`);
      }
      // actp is the only place a per-deputy vote position
      // could live, and its element shape is undeclared in the spec. Print the
      // evidence for a human to read — this script does not interpret it.
      const actp = activity.actp ?? [];
      console.log(
        `  actp: ${actp.length} elements${actp.length ? ` — first: ${JSON.stringify(actp[0]).slice(0, 300)}` : ""}`,
      );
    });
  } else {
    skip("/deputados/{id}/atividade", "no veteran id — the careers step failed");
  }

  const comissoes = await step("/comissoes — the committees list", async () => {
    const result = await listComissoes({ limit: 3 });
    console.log(`  ${result.total} total, showing ${result.data.length}`);
    return result;
  });

  const firstComissao = comissoes?.data[0];
  if (firstComissao) {
    await step(`/comissoes/${firstComissao.id} — the sideways envelope`, async () => {
      const detail = await getComissao(firstComissao.id, { limit: 3 });
      console.log(
        `  ${detail.sigla ?? detail.id} — ${detail.total} initiatives, active in ${detail.legislaturas.length} legislatures`,
      );
    });
  } else {
    skip("/comissoes/{id}", "no committee id — the list step failed");
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} step(s) failed:`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
  console.log("\nOK — every endpoint the extension uses answered as the vendored contract promises");
}

main().catch((e: unknown) => {
  process.stderr.write(`Smoke test aborted: ${errorMessage(e)}\n`);
  process.exit(1);
});
