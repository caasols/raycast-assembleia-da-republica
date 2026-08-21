import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getIniciativa } from "../lib/openar-client";
import { detailStateMarkdown } from "../lib/detail-markdown";
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
  const { isLoading, data, error, revalidate } = usePromise(
    async (initiativeId: number) => getIniciativa(initiativeId),
    [id],
  );

  const markdown = detailStateMarkdown({
    title,
    noun: "this initiative",
    error,
    data,
    render: initiativeFullMarkdown,
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data ? initiativeLabel(data) : title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* A failed detail view was as much a dead end as a failed list. */}
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          {data?.linkTexto && <Action.OpenInBrowser title="Open Full Text" url={data.linkTexto} />}
          <Action.CopyToClipboard title="Copy Title" content={title} />
        </ActionPanel>
      }
    />
  );
}
