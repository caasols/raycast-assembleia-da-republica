import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listComissoes } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { LegislatureDropdown } from "./components/legislature-dropdown";
import { ALL_LEGISLATURES, useLegislatures } from "./components/use-legislatures";
import { CommitteeDetail } from "./components/committee-detail";
import { loadListPage } from "./lib/pagination";
import { getPageSize } from "./lib/preferences";

/**
 * Parliamentary committees.
 *
 * `/comissoes` is the canonical table — each committee has a stable numeric id,
 * which is what `/comissoes/{id}` needs to list the initiatives that passed
 * through it. That detail view is a separate command; this one resolves a name
 * to a committee.
 */
export default function Command() {
  const pageSize = getPageSize();
  const [searchText, setSearchText] = useState("");
  // The "preference until the user chooses" rule lives in the hook, not here.
  const { legislatures, selectedId: selectedLegislature, setSelectedId: setLegislature } = useLegislatures();

  // pageSize is an argument rather than closed over, so a changed preference
  // takes effect without a relaunch.
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (query: string, legislaturaId: string, limit: number) => async (options: { page: number }) =>
      loadListPage(options.page, limit, (page, pageLimit) =>
        listComissoes({
          legislatura: legislaturaId === ALL_LEGISLATURES ? undefined : legislaturaId,
          q: query.trim() === "" ? undefined : query.trim(),
          sort: "asc",
          page,
          limit: pageLimit,
        }),
      ),
    [searchText, selectedLegislature, pageSize],
  );

  const committees = data ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search committees by name"
      pagination={pagination}
      throttle
      searchBarAccessory={
        <LegislatureDropdown legislatures={legislatures} value={selectedLegislature} onChange={setLegislature} />
      }
    >
      {committees.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.TwoPeople}
          title={searchText.trim() === "" ? "No committees" : "No matching committees"}
          description={
            searchText.trim() === "" ? "openAR returned no committees." : `Nothing matched “${searchText.trim()}”.`
          }
        />
      )}
      {committees.map((committee) => (
        <List.Item
          key={committee.id}
          icon={Icon.TwoPeople}
          // A committee without a name is possible in the data; its sigla is
          // still an identifier a reader recognises.
          title={committee.nome ?? committee.sigla ?? `Committee ${committee.id}`}
          subtitle={committee.nome ? (committee.sigla ?? undefined) : undefined}
          keywords={[committee.sigla].filter((k): k is string => Boolean(k))}
          actions={
            <ActionPanel>
              {/* Without this the command is a dead end: a committee you can
                  find but cannot look inside. */}
              <Action.Push
                title="Show Initiatives"
                icon={Icon.Sidebar}
                target={
                  <CommitteeDetail
                    id={committee.id}
                    name={committee.nome ?? committee.sigla ?? `Committee ${committee.id}`}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Name" content={committee.nome ?? committee.sigla ?? ""} />
              {committee.sigla && <Action.CopyToClipboard title="Copy Acronym" content={committee.sigla} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
