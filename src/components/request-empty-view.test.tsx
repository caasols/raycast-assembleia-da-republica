/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { List, Icon } from "@raycast/api";
import { RequestEmptyView } from "./request-empty-view";
import { OpenArError } from "../lib/errors";

afterEach(cleanup);

function renderIn(node: React.ReactNode) {
  // Wrapped in a List because List.EmptyView is only rendered by its parent.
  render(<List>{node}</List>);
  return screen.getByTestId("empty-view");
}

describe("RequestEmptyView", () => {
  it("shows the caller's copy when the request simply found nothing", () => {
    const view = renderIn(
      <RequestEmptyView error={undefined} title="No initiatives" description="Try another term." />,
    );
    expect(view).toHaveAttribute("data-title", "No initiatives");
    expect(view).toHaveAttribute("data-description", "Try another term.");
  });

  it("reports a failure as a failure, not as an empty result", () => {
    const view = renderIn(
      <RequestEmptyView error={new OpenArError("boom", 500)} title="No initiatives" description="unused" />,
    );
    expect(view).toHaveAttribute("data-title", "Could not reach openAR");
    expect(view.getAttribute("data-description")).toContain("boom");
    // The red warning is what tells a scanning eye this is a failure, not a
    // quiet day — the copy alone does not carry that at a glance.
    expect(view).toHaveAttribute("data-icon", "Warning Red");
  });

  it("passes on the wait openAR asked for", () => {
    const view = renderIn(<RequestEmptyView error={new OpenArError("slow down", 429, 45)} title="x" description="y" />);
    expect(view).toHaveAttribute("data-title", "Too many requests");
    expect(view.getAttribute("data-description")).toContain("45 seconds");
    // Orange clock, not red warning: waiting fixes this one.
    expect(view).toHaveAttribute("data-icon", "Clock Orange");
  });

  it("does not invent a wait when none was given", () => {
    const view = renderIn(<RequestEmptyView error={new OpenArError("slow down", 429)} title="x" description="y" />);
    expect(view.getAttribute("data-description")).toContain("shortly");
    expect(view.getAttribute("data-description")).not.toMatch(/\d+ seconds/);
  });

  it("renders a non-Error rejection as text rather than [object Object]", () => {
    const view = renderIn(<RequestEmptyView error="socket hang up" title="x" description="y" />);
    expect(view.getAttribute("data-description")).toContain("socket hang up");
  });

  it("uses the caller's icon for the found-nothing case", () => {
    const view = renderIn(
      <RequestEmptyView error={undefined} title="x" description="y" icon={Icon.Calendar as Icon} />,
    );
    expect(view).toHaveAttribute("data-icon", "Calendar");
  });
});

describe("RequestEmptyView retry", () => {
  const actions = () => screen.queryAllByTestId("action").map((a) => a.getAttribute("data-title"));

  it("offers a retry when the request failed", () => {
    renderIn(<RequestEmptyView error={new OpenArError("boom", 500)} title="x" description="y" onRetry={vi.fn()} />);
    expect(actions()).toContain("Retry");
  });

  it("offers a retry when rate limited, which is the case it exists for", () => {
    // A 429 is the expected failure against a 100 req/min budget, and waiting
    // then retrying is the only thing the user can do about it.
    renderIn(<RequestEmptyView error={new OpenArError("slow", 429, 30)} title="x" description="y" onRetry={vi.fn()} />);
    expect(actions()).toContain("Retry");
  });

  it("calls back when the retry is chosen", () => {
    const onRetry = vi.fn();
    renderIn(<RequestEmptyView error={new OpenArError("boom", 500)} title="x" description="y" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId("action"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers no retry when the request succeeded and simply found nothing", () => {
    // Retrying would return the same nothing; the action would be a lie.
    renderIn(<RequestEmptyView error={undefined} title="No results" description="y" onRetry={vi.fn()} />);
    expect(actions()).not.toContain("Retry");
  });

  it("renders the failure state unchanged when no retry was supplied", () => {
    const view = renderIn(<RequestEmptyView error={new OpenArError("boom", 500)} title="x" description="y" />);
    expect(view).toHaveAttribute("data-title", "Could not reach openAR");
    expect(actions()).not.toContain("Retry");
  });
});
