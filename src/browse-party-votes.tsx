import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getMeta, listVotacoes } from "./lib/openar-client";
import { RequestEmptyView } from "./components/request-empty-view";
import { voteResultIcon } from "./components/vote-result-icon";
import { initiativeReference, resultLabel, voteDetailMarkdown, voteSummary } from "./lib/votes";
import { displayDate } from "./lib/dates";

const PAGE_SIZE = 100;

/** How a party voted, as the three filters `/votacoes` offers. */
const POSITIONS = [
  { id: "a_favor", title: "Voted in favour" },
  { id: "contra", title: "Voted against" },
  { id: "abstencao", title: "Abstained" },
] as const;

type PositionId = (typeof POSITIONS)[number]["id"];

/**
 * Votes filtered by how one party voted.
 *
 * The filtering is the API's, not ours: `/votacoes` takes `a_favor`, `contra`
 * and `abstencao` directly, so "everything Chega voted against" is one request
 * rather than a full download filtered locally.
 *
 * The party list comes from `/meta` rather than a hardcoded set, so a new party
 * entering parliament appears without a release. `/meta` prefixes the five
 * institutional authors onto `grupos`, and they are legal here — unlike on
 * `/deputados` — so the list is used unfiltered.
 */
export default function Command() {
  const [party, setParty] = useState<string | undefined>(undefined);
  const [position, setPosition] = useState<PositionId>("a_favor");

  // Cached: /meta carries the longest max-age openAR sets (an hour), and the
  // party list does not change between keystrokes.
  const { data: meta } = useCachedPromise(async () => getMeta(), []);

  const { isLoading, data, error } = usePromise(
    async (sigla: string | undefined, how: PositionId) => {
      if (!sigla) {
        return [];
      }
      const page = await listVotacoes({ [how]: sigla, sort: "desc", limit: PAGE_SIZE });
      return page.data;
    },
    [party, position],
  );

  const votes = data ?? [];
  const parties = meta?.grupos ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={votes.length > 0}
      searchBarPlaceholder="Filter these votes"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Party"
          value={party ?? ""}
          onChange={(value) => {
            // The dropdown carries both axes so the search bar keeps its own
            // job: filtering the rows already fetched.
            const [nextParty, nextPosition] = value.split("|");
            setParty(nextParty || undefined);
            setPosition((nextPosition as PositionId) ?? "a_favor");
          }}
        >
          <List.Dropdown.Item value="" title="Choose a party…" />
          {POSITIONS.map((option) => (
            <List.Dropdown.Section key={option.id} title={option.title}>
              {parties.map((sigla) => (
                <List.Dropdown.Item key={`${sigla}|${option.id}`} value={`${sigla}|${option.id}`} title={sigla} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {votes.length === 0 && (
        <RequestEmptyView
          error={error}
          icon={Icon.TwoPeople}
          title={party ? "No votes found" : "Choose a party"}
          description={
            party
              ? `${party} has no recorded votes matching that position.`
              : "Pick a party and a position from the dropdown to see how they voted."
          }
        />
      )}
      {votes.map((vote) => (
        <List.Item
          key={`${vote.iniciativaId}:${vote.id}`}
          icon={voteResultIcon(vote)}
          title={vote.iniciativaTitulo}
          subtitle={initiativeReference(vote)}
          accessories={[{ text: vote.data ? displayDate(vote.data) : resultLabel(vote) }]}
          detail={<List.Item.Detail markdown={voteDetailMarkdown(vote)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Vote Summary"
                content={`${vote.iniciativaTitulo} — ${resultLabel(vote)}. ${voteSummary(vote)}`}
              />
              <Action.CopyToClipboard title="Copy Initiative Title" content={vote.iniciativaTitulo} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
