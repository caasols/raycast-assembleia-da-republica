import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPeticao } from "../lib/openar-client";
import { detailStateMarkdown } from "../lib/detail-markdown";
import { petitionFullMarkdown } from "../lib/petition-detail";

/** One petition's full record, pushed from the petitions list. */
export function PetitionDetail({ id, subject }: { id: number; subject: string }) {
  const { isLoading, data, error, revalidate } = usePromise(async (petitionId: number) => getPeticao(petitionId), [id]);

  const markdown = detailStateMarkdown({
    title: subject,
    noun: "this petition",
    error,
    data,
    render: petitionFullMarkdown,
  });

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
