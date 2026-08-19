import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listVotacoes } from "./lib/openar-client";
import { displayDate, todayInLisbon } from "./lib/dates";
import { RequestEmptyView } from "./components/request-empty-view";
import { voteResultIcon } from "./components/vote-result-icon";
import { InitiativeDetail } from "./components/initiative-detail";
import { initiativeReference, resultLabel, voteDetailMarkdown, voteSummary } from "./lib/votes";

/** The API caps `limit` at 200; a single sitting day never approaches that. */
const MAX_VOTES_PER_DAY = 200;

/**
 * Today's plenary votes in the Assembleia da República.
 *
 * One request: `/votacoes` returns each vote already carrying its initiative's
 * title and number, so the list needs no per-vote follow-up.
 *
 * Committee votes are out of scope here by construction — `/votacoes` is
 * documented as "votações em plenário", and committee votes live inside an
 * initiative's `comissoesFases` instead.
 */
export default function Command() {
  const today = todayInLisbon();

  const { isLoading, data, error, revalidate } = usePromise(
    async (date: string) => {
      const page = await listVotacoes({
        dataInicio: date,
        dataFim: date,
        limit: MAX_VOTES_PER_DAY,
      });
      return page.data;
    },
    [today],
  );

  const votes = data ?? [];

  return (
    <List isLoading={isLoading} isShowingDetail={votes.length > 0} searchBarPlaceholder="Filter today's votes">
      {votes.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Calendar}
          title="No votes today"
          // Parliament does not sit every day, so an empty day is the normal
          // case rather than a failure — the copy says which one this is.
          description={`Parliament recorded no plenary votes on ${displayDate(today)}.`}
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
          accessories={[{ text: resultLabel(vote) }]}
          detail={<List.Item.Detail markdown={voteDetailMarkdown(vote)} />}
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
