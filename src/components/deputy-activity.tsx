import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDeputadoAtividade } from "../lib/openar-client";
import { detailStateMarkdown } from "../lib/detail-markdown";
import { activityMarkdown } from "../lib/activity";

/**
 * A deputy's parliamentary activity, pushed from their detail view.
 *
 * Shows how much of each kind of work a deputy does. It deliberately does not
 * attempt an individual voting record: plenary votes are published per party,
 * and per-deputy positions exist only inside `detalhe`'s unsanitised HTML
 * (D40). The view says so rather than leaving the absence to be guessed at.
 */
export function DeputyActivity({ id, name, legislature }: { id: number; name: string; legislature?: string }) {
  const { isLoading, data, error, revalidate } = usePromise(
    async (deputyId: number, leg: string | undefined) => getDeputadoAtividade(deputyId, leg),
    [id, legislature],
  );

  const markdown = detailStateMarkdown({
    title: name,
    noun: "this deputy's activity",
    error,
    data,
    render: (activity) => activityMarkdown(name, activity, legislature),
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Activity`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          <Action.CopyToClipboard title="Copy Name" content={name} />
        </ActionPanel>
      }
    />
  );
}
