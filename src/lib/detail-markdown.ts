/**
 * The markdown a pushed detail view shows across its three states.
 *
 * Every detail view opens with the title its caller already had (D60) — a
 * blank frame would waste what the list already knows — then fills in when the
 * request lands, or explains itself when it fails. Four views repeated this
 * ternary with only the noun changing; the shape lives here so a fifth view
 * cannot invent a subtly different failure state.
 */
import { errorMessage } from "./errors";

export function detailStateMarkdown<T>(options: {
  /** What the caller already knows — shown in every state. */
  title: string;
  /** Fills "Could not load …", e.g. "this initiative". */
  noun: string;
  error: unknown;
  data: T | undefined;
  render: (data: T) => string;
}): string {
  const { title, noun, error, data, render } = options;
  if (error) {
    // The title stays, so this reads as "this thing failed to load" rather
    // than as a bare error with no subject (D60).
    return `# ${title}\n\n**Could not load ${noun}.**\n\n${errorMessage(error)}`;
  }
  if (data !== undefined) {
    return render(data);
  }
  return `# ${title}\n\nLoading…`;
}
