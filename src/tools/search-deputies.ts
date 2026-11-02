import { currentLegislature, listDeputados, listLegislaturas } from "../lib/openar-client";

type Input = {
  /** Part of the deputy's parliamentary name. */
  name?: string;
  /**
   * Party sigla, e.g. "PS". Institutional authors such as "Governo" are **not**
   * valid here — the deputies endpoint rejects them.
   */
  party?: string;
  /** Legislature identifier. Omit for the sitting deputies. */
  legislature?: string;
};

/** AI tool: find deputies. */
export default async function tool(input: Input) {
  // Without a legislature the question is almost always about who is in
  // parliament now. `situacao=ativo` alone does not answer that: it matches
  // every seat ever held, so it must be paired with the current legislature,
  // resolved from live data so it cannot go stale at the next election.
  let legislatura = input.legislature;
  if (!legislatura) {
    legislatura = currentLegislature(await listLegislaturas())?.id;
    if (!legislatura) {
      throw new Error("openAR lists no legislature in progress, so the sitting deputies cannot be determined");
    }
  }
  const page = await listDeputados({
    q: input.name,
    grupo: input.party,
    legislatura,
    situacao: input.legislature ? undefined : "ativo",
    sort: "asc",
    limit: 50,
  });
  return {
    total: page.total,
    deputies: page.data.map((deputy) => ({
      id: deputy.id,
      name: deputy.nomeParlamentar,
      fullName: deputy.nomeCompleto,
      party: deputy.grupoParlamentar,
      constituency: deputy.circuloEleitoral,
      legislature: deputy.legislaturaId,
    })),
  };
}
