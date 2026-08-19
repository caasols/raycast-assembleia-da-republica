import { getDeputadoAtividade } from "../lib/openar-client";
import { activityCounts } from "../lib/activity";

type Input = {
  /** Numeric deputy id (DepCadId), as returned by the deputy search. */
  id: number;
  /** Legislature identifier, e.g. "XVII". Omit for the whole career. */
  legislature?: string;
};

/** AI tool: how much of each kind of parliamentary work a deputy does. */
export default async function tool(input: Input) {
  const activity = await getDeputadoAtividade(input.id, input.legislature);
  return {
    deputy: activity.deputado?.nomeParlamentar ?? null,
    legislature: input.legislature ?? "all",
    activity: activityCounts(activity),
    // Stated in the payload so the model does not infer from an absent field
    // that a deputy never votes — the data simply is not published per person.
    note: "Plenary votes are recorded per party, not per deputy, so no individual voting record is available.",
  };
}
