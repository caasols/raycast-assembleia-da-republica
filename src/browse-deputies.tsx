import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { deputadoPhotoUrl, listDeputados } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { useParties } from "./components/use-parties";
import { ALL_LEGISLATURES, useLegislatures } from "./components/use-legislatures";
import { DeputyDetail } from "./components/deputy-detail";
import { loadListPage } from "./lib/pagination";
import { getPageSize } from "./lib/preferences";
import { deputyDetailMarkdown, deputySubtitle } from "./lib/deputies";

/**
 * `situacao=ativo` means the 230 sitting seats only alongside the current
 * legislature, which the default preference supplies. Under "All legislatures"
 * it matches every seat ever held.
 */
const SITTING = "ativo";
export default function Command() {
  const pageSize = getPageSize();
  // No dropdown here: Raycast allows one search-bar accessory and the party
  // filter is the more useful one for these two commands, so the legislature
  // comes from the Default Legislature preference alone.
  const { initialId: legislatura } = useLegislatures();
  const [searchText, setSearchText] = useState("");
  const [party, setParty] = useState("");

  // pageSize is an argument rather than closed over, so a changed preference
  // takes effect without a relaunch.
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (query: string, sigla: string, legislaturaId: string, limit: number) => async (options: { page: number }) =>
      loadListPage(options.page, limit, (page, pageLimit) =>
        listDeputados({
          legislatura: legislaturaId === ALL_LEGISLATURES ? undefined : legislaturaId,
          q: query.trim() === "" ? undefined : query.trim(),
          grupo: sigla === "" ? undefined : sigla,
          situacao: SITTING,
          sort: "asc",
          page,
          limit: pageLimit,
        }),
      ),
    [searchText, party, legislatura, pageSize],
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
          onRetry={revalidate}
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
