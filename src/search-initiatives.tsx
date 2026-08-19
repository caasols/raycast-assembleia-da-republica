import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listIniciativas } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { LegislatureDropdown } from "./components/legislature-dropdown";
import { useLegislatures } from "./components/use-legislatures";
import { InitiativeDetail } from "./components/initiative-detail";
import { initiativeDetailMarkdown, initiativeLabel } from "./lib/initiatives";
import { displayDate } from "./lib/dates";
import { hasMorePages, toApiPage } from "./lib/pagination";
import { getPageSize } from "./lib/preferences";

/**
 * Search legislative initiatives.
 *
 * The search runs server-side (`/iniciativas?q=`) rather than filtering a local
 * page, because the corpus spans every legislature since 1976 and no useful
 * subset of it fits in the extension. That makes `throttle` load-bearing rather
 * than cosmetic: openAR allows 100 requests a minute, and an unthrottled
 * request per keystroke would exhaust that in seconds.
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
      const result = await listIniciativas({
        legislatura: legislaturaId === "" ? undefined : legislaturaId,
        // Empty search is a valid request: it returns the most recent
        // initiatives, which is a better landing state than a blank screen.
        q: query.trim() === "" ? undefined : query.trim(),
        sort: "desc",
        page: apiPage,
        limit: pageSize,
      });
      return { data: result.data, hasMore: hasMorePages(apiPage, pageSize, result.total) };
    },
    [searchText, selectedLegislature],
  );

  const initiatives = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={initiatives.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search initiatives by title"
      pagination={pagination}
      // Native filtering is off once onSearchTextChange is set, which is
      // correct here: the server has already matched, and filtering the page
      // again locally would hide rows the search deliberately returned.
      throttle
      searchBarAccessory={
        <LegislatureDropdown legislatures={legislatures} value={selectedLegislature} onChange={setLegislature} />
      }
    >
      {initiatives.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Document}
          title={searchText.trim() === "" ? "No initiatives" : "No matching initiatives"}
          description={
            searchText.trim() === ""
              ? "openAR returned no initiatives."
              : `Nothing matched “${searchText.trim()}”. Search covers initiative titles.`
          }
        />
      )}
      {initiatives.map((initiative) => (
        <List.Item
          key={initiative.id}
          title={initiative.titulo}
          subtitle={initiativeLabel(initiative)}
          keywords={[initiative.numero, initiative.tipoDesc, initiative.legislaturaId]}
          accessories={[{ text: initiative.dataEntrada ? displayDate(initiative.dataEntrada) : undefined }]}
          detail={<List.Item.Detail markdown={initiativeDetailMarkdown(initiative)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<InitiativeDetail id={initiative.id} title={initiative.titulo} />}
              />
              {/* Only offered when the record carries a link; the detail pane
                  says so explicitly when it does not. */}
              {initiative.linkTexto && <Action.OpenInBrowser title="Open Full Text" url={initiative.linkTexto} />}
              <Action.CopyToClipboard title="Copy Title" content={initiative.titulo} />
              <Action.CopyToClipboard title="Copy Reference" content={initiativeLabel(initiative)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
