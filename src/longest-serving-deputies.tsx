import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listCarreiras } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { careerDetailMarkdown, careerSubtitle } from "./lib/careers";
import { getPageSize } from "./lib/preferences";

/**
 * Deputies ranked by how many legislatures they have served.
 *
 * One endpoint, one list — `/deputados/carreiras` does the ranking server-side
 * and returns aggregate statistics for the whole population alongside the page,
 * so the comparison in each row costs nothing extra.
 */
export default function Command() {
  // Not a page — this ranking is a top-N — but it is the same "how many
  // results do you want" question the preference answers.
  const rankingSize = getPageSize();
  // The size is a parameter rather than a closed-over value: usePromise types
  // its dependency array against the function's own arguments, and re-runs when
  // they change — which is what makes a changed preference take effect.
  const { isLoading, data, error } = usePromise(async (size: number) => listCarreiras(size), [rankingSize]);

  const careers = data?.data ?? [];
  const stats = data?.stats ?? null;

  return (
    <List isLoading={isLoading} isShowingDetail={careers.length > 0} searchBarPlaceholder="Filter by name">
      {careers.length === 0 && (
        <RequestEmptyView
          error={error}
          icon={Icon.Trophy}
          title="No ranking available"
          description="openAR returned no career data."
        />
      )}
      {careers.map((career, index) => (
        <List.Item
          key={career.id}
          // The rank is the point of the list, and it is positional rather than
          // a field on the record, so it comes from the index.
          title={`${index + 1}. ${career.nomeParlamentar}`}
          subtitle={careerSubtitle(career)}
          keywords={[career.lastParty, ...career.legIds].filter((k): k is string => Boolean(k))}
          accessories={[{ text: `${career.totalLegs} legislatures` }]}
          detail={<List.Item.Detail markdown={careerDetailMarkdown(career, stats)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Name" content={career.nomeParlamentar} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
