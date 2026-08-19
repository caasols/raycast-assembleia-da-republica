/**
 * Markdown for a petition's full record — its committee passage and documents.
 */
import type { PeticaoDetail } from "./types";
import { petitionDetailMarkdown } from "./petitions";

export function petitionFullMarkdown(petition: PeticaoDetail): string {
  // The list-level summary already covers subject, author, signatures, status
  // and dates; this adds only what the detail request brings back.
  const lines = [petitionDetailMarkdown(petition)];

  const committees = petition.comissoes ?? [];
  if (committees.length > 0) {
    lines.push(
      "",
      "## Committees",
      ...committees.map((c) => `- ${c.nome ?? "Unnamed committee"}${c.situacao ? ` — ${c.situacao}` : ""}`),
    );
  }

  const documents = (petition.documentos ?? []).filter((d) => d.nome || d.url);
  if (documents.length > 0) {
    lines.push(
      "",
      "## Documents",
      // Linked where there is a URL, named where there is not — a document
      // whose link is missing is still worth knowing exists.
      ...documents.map((d) => (d.url ? `- [${d.nome ?? "Document"}](${d.url})` : `- ${d.nome}`)),
    );
  }

  return lines.join("\n");
}
