import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPeticao } from "../lib/openar-client";
import { errorMessage } from "../lib/errors";
import { petitionFullMarkdown } from "../lib/petition-detail";

/** One petition's full record, pushed from the petitions list. */
export function PetitionDetail({ id, subject }: { id: number; subject: string }) {
  const { isLoading, data, error, revalidate } = usePromise(async (petitionId: number) => getPeticao(petitionId), [id]);

  const markdown = error
    ? `# ${subject}\n\n**Could not load this petition.**\n\n${errorMessage(error)}`
    : data
      ? petitionFullMarkdown(data)
      : `# ${subject}\n\nLoading…`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={subject}
      markdown={markdown}
      actions={
        <ActionPanel>
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          {data?.urlTexto && <Action.OpenInBrowser title="Open Petition Text" url={data.urlTexto} />}
          <Action.CopyToClipboard title="Copy Subject" content={subject} />
        </ActionPanel>
      }
    />
  );
}
