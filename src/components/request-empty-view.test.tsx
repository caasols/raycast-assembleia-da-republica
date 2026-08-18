/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
  });

  it("passes on the wait openAR asked for", () => {
    const view = renderIn(<RequestEmptyView error={new OpenArError("slow down", 429, 45)} title="x" description="y" />);
    expect(view).toHaveAttribute("data-title", "Too many requests");
    expect(view.getAttribute("data-description")).toContain("45 seconds");
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
