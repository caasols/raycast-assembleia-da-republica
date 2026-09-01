import { Action, ActionPanel, Icon, LaunchType, launchCommand, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listCarreiras } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { careerDetailMarkdown, rankingCoverage } from "./lib/careers";
import { MAX_LIMIT } from "./lib/query";
import { DeputyDetail } from "./components/deputy-detail";

/**
 * Deputies ranked by how many legislatures they have served.
 *
 * One endpoint, one list — `/deputados/carreiras` does the ranking server-side.
 *
 * **Always asks for the maximum, and deliberately ignores the `Results per Page`
 * preference** (D122). The search bar filters only what was fetched, because the
 * endpoint takes no `q`, so the fetch size silently decides whether a search can
 * succeed at all. Tying that to a paging preference meant a deputy at rank 51
 * answered "no results" for no reason the user could see. The ceiling is the
 * API's, not ours: measured 2026-09-01, `limit=500` and `limit=3000` both return
 * 200 rows and `page` is ignored, so 200 of 2,586 deputies is the most this
 * endpoint will ever give.
 */
export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(async (size: number) => listCarreiras(size), [MAX_LIMIT]);

  const careers = data?.data ?? [];
  const stats = data?.stats ?? null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={careers.length > 0}
      // States the scope BEFORE a search rather than after it. The endpoint takes
      // no `q`, so the bar filters only these rows; a user who searches someone
      // deeper than the cap would otherwise read "no results" as "never sat"
      // (D122). Said here rather than in the empty view because `RequestEmptyView`
      // is a wrapper component, and whether Raycast recognises a wrapper as an
      // EmptyView when items exist is not something this repo has verified.
      searchBarPlaceholder={careers.length > 0 ? `Filter the top ${careers.length} by name` : "Filter by name"}
    >
      {careers.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Trophy}
          title="No ranking available"
          description={rankingCoverage(careers, stats)}
        />
      )}
      {careers.map((career, index) => (
        <List.Item
          key={career.id}
          // The rank is the point of the list, and it is positional rather than
          // a field on the record, so it comes from the index.
          // No subtitle. The party and the year span used to sit here and cost
          // the name most of its width, so every row read "1. José C...". Both
          // are in the detail pane, and the party is still a keyword, so
          // nothing became unreachable or unsearchable (D122).
          title={`${index + 1}. ${career.nomeParlamentar}`}
          keywords={[career.lastParty, ...career.legIds].filter((k): k is string => Boolean(k))}
          accessories={[{ text: `${career.totalLegs} legislatures` }]}
          detail={<List.Item.Detail markdown={careerDetailMarkdown(career)} />}
          actions={
            <ActionPanel>
              {/* The ranking names deputies and carries their ids, so ending
                  here would be a dead end for no reason. */}
              <Action.Push
                title="Show Deputy"
                icon={Icon.Sidebar}
                target={<DeputyDetail id={career.id} name={career.nomeParlamentar} />}
              />
              <Action.CopyToClipboard title="Copy Name" content={career.nomeParlamentar} />
              {/* This list can only ever hold 200 of 2,586 deputies, and cannot
                  search past them. /deputados takes a real `q` and searches all
                  of them server-side, so the way out is one action rather than a
                  dead end (D122). On every row, not just an empty state, because
                  a wrapper EmptyView's visibility is not something we control. */}
              <Action
                title="Search All Deputies"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "browse-deputies", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
