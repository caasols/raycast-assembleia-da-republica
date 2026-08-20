import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getComissao } from "../lib/openar-client";
import { RequestEmptyView } from "./request-empty-view";
import { InitiativeDetail } from "./initiative-detail";
import { initiativeDetailMarkdown, initiativeLabel } from "../lib/initiatives";
import { displayDate } from "../lib/dates";
import { loadListPage } from "../lib/pagination";
import { getPageSize } from "../lib/preferences";

/**
 * The initiatives that passed through one committee.
 *
 * A List rather than a Detail, because the payload is a paginated collection
 * with the committee's own metadata alongside it — so this is another
 * navigable level, not a leaf.
 */
export function CommitteeDetail({ id, name }: { id: number; name: string }) {
  const pageSize = getPageSize();
  // pageSize is an argument rather than closed over, so a changed preference
  // takes effect without a relaunch.
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (committeeId: number, limit: number) => async (options: { page: number }) =>
      loadListPage(options.page, limit, (page, pageLimit) =>
        getComissao(committeeId, { sort: "desc", page, limit: pageLimit }),
      ),
    [id, pageSize],
  );

  const initiatives = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={initiatives.length > 0}
      navigationTitle={name}
      searchBarPlaceholder="Filter these initiatives"
      pagination={pagination}
    >
      {initiatives.length === 0 && (
        <RequestEmptyView
          error={error}
          onRetry={revalidate}
          icon={Icon.Document}
          title="No initiatives"
          description={`No initiatives are recorded as having passed through ${name}.`}
        />
      )}
      {initiatives.map((initiative) => (
        <List.Item
          key={initiative.id}
          title={initiative.titulo}
          subtitle={initiativeLabel(initiative)}
          accessories={[{ text: initiative.dataEntrada ? displayDate(initiative.dataEntrada) : undefined }]}
          detail={<List.Item.Detail markdown={initiativeDetailMarkdown(initiative)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<InitiativeDetail id={initiative.id} title={initiative.titulo} />}
              />
              <Action.CopyToClipboard title="Copy Title" content={initiative.titulo} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
