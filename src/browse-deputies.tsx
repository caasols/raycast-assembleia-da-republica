import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { deputadoPhotoUrl, getMeta, listDeputados, parliamentaryGroups } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { deputyDetailMarkdown, deputySubtitle } from "./lib/deputies";

/** `situacao=ativo` is the API's shortcut for the 230 sitting seats. */
const SITTING = "ativo";
const PAGE_SIZE = 200;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [party, setParty] = useState("");

  const { data: meta } = useCachedPromise(async () => getMeta(), []);

  const { isLoading, data, error } = usePromise(
    async (query: string, sigla: string) => {
      const page = await listDeputados({
        q: query.trim() === "" ? undefined : query.trim(),
        grupo: sigla === "" ? undefined : sigla,
        situacao: SITTING,
        sort: "asc",
        limit: PAGE_SIZE,
      });
      return page.data;
    },
    [searchText, party],
  );

  const deputies = data ?? [];
  // /deputados rejects the five institutional authors that /meta prefixes onto
  // `grupos`, so this dropdown must not offer them — unlike the votes one.
  const parties = parliamentaryGroups(meta?.grupos ?? []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={deputies.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search sitting deputies by name"
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
              <Action.CopyToClipboard title="Copy Name" content={deputy.nomeParlamentar} />
              <Action.CopyToClipboard title="Copy Full Name" content={deputy.nomeCompleto} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
