import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getIniciativa } from "../lib/openar-client";
import { errorMessage } from "../lib/errors";
import { initiativeFullMarkdown } from "../lib/initiative-detail";
import { initiativeLabel } from "../lib/initiatives";

/**
 * The full record of one initiative, pushed from any list that names one.
 *
 * Three commands can reach it — the two vote lists carry `iniciativaId` on
 * every row, and Search Initiatives has the initiative itself — which is why
 * this is a component rather than a root command.
 */
export function InitiativeDetail({ id, title }: { id: number; title: string }) {
  const { isLoading, data, error } = usePromise(async (initiativeId: number) => getIniciativa(initiativeId), [id]);

  // The pushed view opens instantly with the title the caller already had,
  // rather than a blank pane, and fills in as the request lands.
  const markdown = error
    ? `# ${title}\n\n**Could not load this initiative.**\n\n${errorMessage(error)}`
    : data
      ? initiativeFullMarkdown(data)
      : `# ${title}\n\nLoading…`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data ? initiativeLabel(data) : title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data?.linkTexto && <Action.OpenInBrowser title="Open Full Text" url={data.linkTexto} />}
          <Action.CopyToClipboard title="Copy Title" content={title} />
        </ActionPanel>
      }
    />
  );
}
