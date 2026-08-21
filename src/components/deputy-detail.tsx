import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDeputado } from "../lib/openar-client";
import { detailStateMarkdown } from "../lib/detail-markdown";
import { deputyFullMarkdown } from "../lib/deputy-detail";
import { DeputyActivity } from "./deputy-activity";

/** One deputy's full record, pushed from the deputies list. */
export function DeputyDetail({ id, name }: { id: number; name: string }) {
  const { isLoading, data, error, revalidate } = usePromise(async (deputyId: number) => getDeputado(deputyId), [id]);

  const markdown = detailStateMarkdown({ title: name, noun: "this deputy", error, data, render: deputyFullMarkdown });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* A failed detail view was as much a dead end as a failed list. */}
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          <Action.Push
            title="Show Parliamentary Activity"
            icon={Icon.BulletPoints}
            target={<DeputyActivity id={id} name={name} legislature={data?.legislaturaId} />}
          />
          <Action.CopyToClipboard title="Copy Name" content={name} />
        </ActionPanel>
      }
    />
  );
}
