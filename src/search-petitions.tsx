import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listPeticoes } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { LegislatureDropdown } from "./components/legislature-dropdown";
import { useLegislatures } from "./components/use-legislatures";
import { petitionDetailMarkdown, signatureLabel } from "./lib/petitions";
import { hasMorePages, toApiPage } from "./lib/pagination";
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
  const { legislatures, initialId } = useLegislatures();
  // undefined until the list loads, so the preference's "current" can
  // resolve before the user's own choice takes over.
  const [legislature, setLegislature] = useState<string | undefined>(undefined);
  const selectedLegislature = legislature ?? initialId;

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (query: string, legislaturaId: string) => async (options: { page: number }) => {
      const apiPage = toApiPage(options.page);
      const result = await listPeticoes({
        legislatura: legislaturaId === "" ? undefined : legislaturaId,
        q: query.trim() === "" ? undefined : query.trim(),
        sort: "desc",
        page: apiPage,
        limit: pageSize,
      });
      return { data: result.data, hasMore: hasMorePages(apiPage, pageSize, result.total) };
    },
    [searchText, selectedLegislature],
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
              {petition.urlTexto && <Action.OpenInBrowser title="Open Petition Text" url={petition.urlTexto} />}
              <Action.CopyToClipboard title="Copy Subject" content={petition.assunto ?? ""} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
