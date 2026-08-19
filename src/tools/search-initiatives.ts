import { listIniciativas } from "../lib/openar-client";
import { initiativeLabel } from "../lib/initiatives";

type Input = {
  /** Words to match against the initiative's title, in Portuguese. */
  query?: string;
  /** Legislature identifier, e.g. "XVII". Omit to search every legislature. */
  legislature?: string;
  /** Party or institutional author, e.g. "PS", "CH", "Governo". */
  group?: string;
  /**
   * Whether the initiative passed. Lowercase here — the vote endpoint uses the
   * capitalised form instead, and they are not interchangeable.
   */
  outcome?: "aprovado" | "rejeitado" | "pendente";
};

/** AI tool: find legislative initiatives. */
export default async function tool(input: Input) {
  const page = await listIniciativas({
    q: input.query,
    legislatura: input.legislature,
    grupo: input.group,
    resultado: input.outcome,
    sort: "desc",
    limit: 25,
  });
  return {
    total: page.total,
    initiatives: page.data.map((initiative) => ({
      id: initiative.id,
      title: initiative.titulo,
      reference: initiativeLabel(initiative),
      legislature: initiative.legislaturaId,
      entered: initiative.dataEntrada,
      // Deliberately named "stage": openAR's `estado` is the phase of the last
      // recorded event, not a verdict, and calling it a result would invite the
      // model to report a bill as passed when it merely reached a stage.
      stage: initiative.estado,
      fullTextUrl: initiative.linkTexto,
    })),
  };
}
