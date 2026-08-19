import { listPeticoes } from "../lib/openar-client";

type Input = {
  /** Words to match against the petition's subject, in Portuguese. */
  query?: string;
  /** Legislature identifier, e.g. "XVII". Omit to search every legislature. */
  legislature?: string;
  /** Petition status, e.g. "Admitida", "Arquivada". */
  status?: string;
};

/** AI tool: find petitions to parliament. */
export default async function tool(input: Input) {
  const page = await listPeticoes({
    q: input.query,
    legislatura: input.legislature,
    situacao: input.status,
    sort: "desc",
    limit: 25,
  });
  return {
    total: page.total,
    petitions: page.data.map((petition) => ({
      id: petition.id,
      subject: petition.assunto,
      author: petition.autor,
      // The number is the consequential fact: petitions cross thresholds at
      // 1 000, 4 000 and 7 500 signatures, so it belongs in the answer.
      signatures: petition.assinaturas,
      status: petition.situacao,
      submitted: petition.dataEntrada,
      debated: petition.dataDebate,
      legislature: petition.legislaturaId,
      textUrl: petition.urlTexto,
    })),
  };
}
