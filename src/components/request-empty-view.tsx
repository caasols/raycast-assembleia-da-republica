import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { errorMessage, OpenArError } from "../lib/errors";

/**
 * The empty state for a list backed by an openAR request.
 *
 * Extracted on its second use rather than in anticipation of one. Every such
 * list has the same three ways of showing nothing, and they mean different
 * things: the request failed, the request was rate limited, or it succeeded and
 * there genuinely is nothing. Collapsing them — telling a user "no results"
 * when the request actually failed — is a lie they cannot see through, so the
 * distinction lives in one place rather than being re-derived per command.
 */
export function RequestEmptyView({
  error,
  title,
  description,
  icon = Icon.MagnifyingGlass,
  onRetry,
}: {
  error: unknown;
  /** Shown when the request succeeded and returned nothing. */
  title: string;
  description: string;
  icon?: Icon;
  /**
   * Usually the `revalidate` from `usePromise`. Offered only on the failure
   * states, because retrying a request that succeeded and found nothing would
   * just return nothing again.
   */
  onRetry?: () => void;
}) {
  // With a 100 req/min budget a transient 429 is the expected failure rather
  // than an exotic one, and retrying is the one thing the user can actually do
  // about it — so not offering it left them re-running the whole command.
  const retry = onRetry ? (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
    </ActionPanel>
  ) : undefined;
  if (error instanceof OpenArError && error.isRateLimited) {
    const wait = error.retryAfterSeconds;
    return (
      <List.EmptyView
        icon={{ source: Icon.Clock, tintColor: Color.Orange }}
        title="Too many requests"
        // openAR allows 100 requests a minute. When it tells us how long to
        // wait, pass that on rather than inventing a number.
        description={
          wait === undefined
            ? "openAR is rate limiting this connection. Try again shortly."
            : `openAR is rate limiting this connection. Try again in ${wait} seconds.`
        }
        actions={retry}
      />
    );
  }

  if (error) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        title="Could not reach openAR"
        description={errorMessage(error)}
        actions={retry}
      />
    );
  }

  return <List.EmptyView icon={icon} title={title} description={description} />;
}
