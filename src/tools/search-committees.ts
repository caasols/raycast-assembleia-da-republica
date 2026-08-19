import { listComissoes } from "../lib/openar-client";

type Input = {
  /** Words to match against the committee's name, in Portuguese. */
  query?: string;
  /** Legislature identifier, e.g. "XVII". Omit for every legislature. */
  legislature?: string;
};

/** AI tool: find parliamentary committees. */
export default async function tool(input: Input) {
  const page = await listComissoes({
    q: input.query,
    legislatura: input.legislature,
    sort: "asc",
    limit: 50,
  });
  return {
    total: page.total,
    committees: page.data.map((committee) => ({
      // The id is what `/comissoes/{id}` needs, so a follow-up question about
      // this committee's work does not have to resolve the name again.
      id: committee.id,
      name: committee.nome,
      acronym: committee.sigla,
    })),
  };
}
