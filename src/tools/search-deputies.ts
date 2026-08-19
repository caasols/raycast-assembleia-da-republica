import { listDeputados } from "../lib/openar-client";

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
  const page = await listDeputados({
    q: input.name,
    grupo: input.party,
    legislatura: input.legislature,
    // Without a legislature the question is almost always about who is in
    // parliament now, which is exactly the 230 seats this shortcut selects.
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
