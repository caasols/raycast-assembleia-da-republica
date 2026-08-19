import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDeputado } from "../lib/openar-client";
import { errorMessage } from "../lib/errors";
import { deputyFullMarkdown } from "../lib/deputy-detail";

/** One deputy's full record, pushed from the deputies list. */
export function DeputyDetail({ id, name }: { id: number; name: string }) {
  const { isLoading, data, error } = usePromise(async (deputyId: number) => getDeputado(deputyId), [id]);

  const markdown = error
    ? `# ${name}\n\n**Could not load this deputy.**\n\n${errorMessage(error)}`
    : data
      ? deputyFullMarkdown(data)
      : `# ${name}\n\nLoading…`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Name" content={name} />
        </ActionPanel>
      }
    />
  );
}
