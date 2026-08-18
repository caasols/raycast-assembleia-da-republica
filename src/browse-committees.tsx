import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { listComissoes } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";

const PAGE_SIZE = 200;

/**
 * Parliamentary committees.
 *
 * `/comissoes` is the canonical table — each committee has a stable numeric id,
 * which is what `/comissoes/{id}` needs to list the initiatives that passed
 * through it. That detail view is a separate command; this one resolves a name
 * to a committee.
 */
export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error } = usePromise(
    async (query: string) => {
      const page = await listComissoes({
        q: query.trim() === "" ? undefined : query.trim(),
        sort: "asc",
        limit: PAGE_SIZE,
      });
      return page.data;
    },
    [searchText],
  );

  const committees = data ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search committees by name"
      throttle
    >
      {committees.length === 0 && (
        <RequestEmptyView
          error={error}
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
              <Action.CopyToClipboard title="Copy Name" content={committee.nome ?? committee.sigla ?? ""} />
              {committee.sigla && <Action.CopyToClipboard title="Copy Acronym" content={committee.sigla} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
