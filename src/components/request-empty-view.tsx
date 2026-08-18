import { Color, Icon, List } from "@raycast/api";
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
}: {
  error: unknown;
  /** Shown when the request succeeded and returned nothing. */
  title: string;
  description: string;
  icon?: Icon;
}) {
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
      />
    );
  }

  if (error) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        title="Could not reach openAR"
        description={errorMessage(error)}
      />
    );
  }

  return <List.EmptyView icon={icon} title={title} description={description} />;
}
