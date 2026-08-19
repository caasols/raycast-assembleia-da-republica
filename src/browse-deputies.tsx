import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { deputadoPhotoUrl, listDeputados } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { useParties } from "./components/use-parties";
import { DeputyDetail } from "./components/deputy-detail";
import { hasMorePages, toApiPage } from "./lib/pagination";
import { deputyDetailMarkdown, deputySubtitle } from "./lib/deputies";

/** `situacao=ativo` is the API's shortcut for the 230 sitting seats. */
const SITTING = "ativo";
/**
 * Below the API's maximum of 200 on purpose. There are 230 sitting deputies and
 * `limit` caps at 200, so no single request can return them all — before
 * pagination, 30 members of parliament were simply unreachable here. A smaller
 * page also gets the first screenful up faster.
 */
const PAGE_SIZE = 100;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [party, setParty] = useState("");

  const { isLoading, data, error, pagination } = useCachedPromise(
    (query: string, sigla: string) => async (options: { page: number }) => {
      const apiPage = toApiPage(options.page);
      const result = await listDeputados({
        q: query.trim() === "" ? undefined : query.trim(),
        grupo: sigla === "" ? undefined : sigla,
        situacao: SITTING,
        sort: "asc",
        page: apiPage,
        limit: PAGE_SIZE,
      });
      return { data: result.data, hasMore: hasMorePages(apiPage, PAGE_SIZE, result.total) };
    },
    [searchText, party],
  );

  const deputies = data ?? [];
  // "members": /deputados rejects the five institutional authors, unlike the
  // votes command's dropdown.
  const parties = useParties("members");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={deputies.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search sitting deputies by name"
      pagination={pagination}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Parliamentary group" value={party} onChange={setParty}>
          <List.Dropdown.Item value="" title="All groups" />
          {parties.map((sigla) => (
            <List.Dropdown.Item key={sigla} value={sigla} title={sigla} />
          ))}
        </List.Dropdown>
      }
    >
      {deputies.length === 0 && (
        <RequestEmptyView
          error={error}
          icon={Icon.Person}
          title="No deputies found"
          description={
            searchText.trim() === ""
              ? "openAR returned no sitting deputies."
              : `Nothing matched “${searchText.trim()}”.`
          }
        />
      )}
      {deputies.map((deputy) => (
        <List.Item
          key={deputy.id}
          // The photo endpoint 302s to a CDN that 404s for deputies without
          // one, so a fallback icon is required rather than optional.
          icon={{ source: deputadoPhotoUrl(deputy.id), fallback: Icon.Person }}
          title={deputy.nomeParlamentar}
          subtitle={deputySubtitle(deputy)}
          keywords={[deputy.nomeCompleto, deputy.grupoParlamentar, deputy.circuloEleitoral].filter((k): k is string =>
            Boolean(k),
          )}
          accessories={[{ text: deputy.grupoParlamentar ?? undefined }]}
          detail={<List.Item.Detail markdown={deputyDetailMarkdown(deputy)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<DeputyDetail id={deputy.id} name={deputy.nomeParlamentar} />}
              />
              <Action.CopyToClipboard title="Copy Name" content={deputy.nomeParlamentar} />
              <Action.CopyToClipboard title="Copy Full Name" content={deputy.nomeCompleto} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
