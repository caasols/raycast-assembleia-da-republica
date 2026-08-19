import { getDeputado } from "../lib/openar-client";
import { mandateLine } from "../lib/deputy-detail";

type Input = {
  /** Numeric deputy id (DepCadId), as returned by the deputy search. */
  id: number;
};

/** AI tool: one deputy's profile, mandates and authorship record. */
export default async function tool(input: Input) {
  const deputy = await getDeputado(input.id);
  return {
    id: deputy.id,
    name: deputy.nomeParlamentar,
    fullName: deputy.nomeCompleto,
    party: deputy.grupoParlamentar,
    constituency: deputy.circuloEleitoral,
    profession: deputy.profissao,
    mandates: deputy.mandatos.map(mandateLine),
    // Authored versus approved is the one pair that says something about a
    // record rather than a CV.
    initiativesAuthored: deputy.stats?.total ?? null,
    initiativesApproved: deputy.stats?.aprovadas ?? null,
    recentInitiatives: deputy.iniciativas.map((i) => ({ id: i.id, title: i.titulo, entered: i.dataEntrada })),
  };
}
