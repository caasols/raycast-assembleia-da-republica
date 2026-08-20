import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listPeticoes } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { PetitionDetail } from "./components/petition-detail";
import { LegislatureDropdown } from "./components/legislature-dropdown";
import { ALL_LEGISLATURES, useLegislatures } from "./components/use-legislatures";
import { petitionDetailMarkdown, signatureLabel } from "./lib/petitions";
import { loadListPage } from "./lib/pagination";
import { getPageSize } from "./lib/preferences";

/**
 * Search petitions to parliament.
 *
 * Same shape as Search Initiatives — server-side, throttled — because the
 * reasons are the same: the corpus is far larger than a page, and openAR allows
 * 100 requests a minute.
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
        listPeticoes({
          legislatura: legislaturaId === ALL_LEGISLATURES ? undefined : legislaturaId,
          q: query.trim() === "" ? undefined : query.trim(),
          sort: "desc",
          page,
          limit: pageLimit,
        }),
      ),
    [searchText, selectedLegislature, pageSize],
  );

  const petitions = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={petitions.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search petitions by subject"
      pagination={pagination}
      throttle
      searchBarAccessory={
        <LegislatureDropdown legislatures={legislatures} value={selectedLegislature} onChange={setLegislature} />
      }
    >
      {petitions.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Envelope}
          title={searchText.trim() === "" ? "No petitions" : "No matching petitions"}
          description={
            searchText.trim() === ""
              ? "openAR returned no petitions."
              : `Nothing matched “${searchText.trim()}”. Search covers petition subjects.`
          }
        />
      )}
      {petitions.map((petition) => (
        <List.Item
          key={petition.id}
          title={petition.assunto ?? "Untitled petition"}
          subtitle={petition.autor ?? undefined}
          keywords={[petition.numero, petition.situacao].filter((k): k is string => Boolean(k))}
          accessories={[{ text: signatureLabel(petition) ?? undefined }]}
          detail={<List.Item.Detail markdown={petitionDetailMarkdown(petition)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<PetitionDetail id={petition.id} subject={petition.assunto ?? "Untitled petition"} />}
              />
              {petition.urlTexto && <Action.OpenInBrowser title="Open Petition Text" url={petition.urlTexto} />}
              <Action.CopyToClipboard title="Copy Subject" content={petition.assunto ?? ""} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
