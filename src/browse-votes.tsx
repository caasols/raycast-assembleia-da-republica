import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listVotacoes } from "./lib/openar-client";
import { displayDate } from "./lib/dates";
import { RequestEmptyView } from "./components/request-empty-view";
import { voteResultIcon } from "./components/vote-result-icon";
import { InitiativeDetail } from "./components/initiative-detail";
import { VotePartyMetadata } from "./components/vote-party-tags";
import { LegislatureDropdown } from "./components/legislature-dropdown";
import { ALL_LEGISLATURES, useLegislatures } from "./components/use-legislatures";
import { initiativeReference, resultLabel, voteDetailMarkdown, voteSummary } from "./lib/votes";
import { loadListPage } from "./lib/pagination";
import { getPageSize } from "./lib/preferences";

/**
 * Plenary votes in the Assembleia da República, newest first.
 *
 * One request: `/votacoes` returns each vote already carrying its initiative's
 * title and number, so the list needs no per-vote follow-up.
 *
 * **Deliberately not date-bounded** (D116). This command used to ask for
 * `data_inicio = data_fim = today`, which measured against the live API means an
 * empty screen on 311 days out of 365: parliament recorded votes on 54 distinct
 * days in the year to 2026-08-31, and had not sat for the 45 days before that.
 * Sorting the whole archive descending puts today's votes at the top on a
 * sitting day and the most recent ones there on every other day, which is what
 * openar.pt/votacoes itself does. The legislature dropdown is the filter that
 * earns the one search-bar accessory, matching Search Initiatives, Search
 * Petitions and Browse Committees rather than inventing a period selector for
 * this command alone.
 *
 * Committee votes are out of scope here by construction — `/votacoes` is
 * documented as "votações em plenário", and committee votes live inside an
 * initiative's `comissoesFases` instead.
 */
export default function Command() {
  const pageSize = getPageSize();
  // The "preference until the user chooses" rule lives in the hook, not here.
  const { legislatures, selectedId: selectedLegislature, setSelectedId: setLegislature } = useLegislatures();

  // pageSize is an argument rather than closed over, so a changed preference
  // takes effect without a relaunch.
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (legislaturaId: string, limit: number) => async (options: { page: number }) =>
      loadListPage(options.page, limit, (page, pageLimit) =>
        listVotacoes({
          legislatura: legislaturaId === ALL_LEGISLATURES ? undefined : legislaturaId,
          // No dataInicio/dataFim: the archive is the point. See the note above.
          sort: "desc",
          page,
          limit: pageLimit,
        }),
      ),
    [selectedLegislature, pageSize],
  );

  const votes = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={votes.length > 0}
      searchBarPlaceholder="Filter these votes"
      pagination={pagination}
      searchBarAccessory={
        <LegislatureDropdown legislatures={legislatures} value={selectedLegislature} onChange={setLegislature} />
      }
    >
      {votes.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Calendar}
          title="No votes"
          // An empty legislature is a normal answer rather than a failure — the
          // copy says which one this is.
          description="openAR recorded no plenary votes for this legislature."
        />
      )}
      {votes.map((vote) => (
        // Vote ids are unique per initiative rather than globally, so the key
        // is the pair — two initiatives can each carry a vote called "1".
        <List.Item
          key={`${vote.iniciativaId}:${vote.id}`}
          icon={voteResultIcon(vote)}
          title={vote.iniciativaTitulo}
          subtitle={initiativeReference(vote)}
          keywords={[vote.iniciativaNumero, vote.resultado, ...vote.aFavor, ...vote.contra]}
          // Both, now that the list spans years rather than one day: the date
          // because a row is meaningless without it, and the result label
          // because the icon's colour cannot say "unanimous".
          accessories={
            vote.data ? [{ text: displayDate(vote.data) }, { text: resultLabel(vote) }] : [{ text: resultLabel(vote) }]
          }
          detail={<List.Item.Detail markdown={voteDetailMarkdown(vote)} metadata={<VotePartyMetadata vote={vote} />} />}
          actions={
            <ActionPanel>
              {/* Every vote row carries its initiative's id, so the whole
                  record is one push away rather than a separate search. */}
              <Action.Push
                title="Show Initiative"
                icon={Icon.Sidebar}
                target={<InitiativeDetail id={vote.iniciativaId} title={vote.iniciativaTitulo} />}
              />
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
