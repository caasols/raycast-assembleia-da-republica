/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Command from "./what-was-the-vote-today";

afterEach(cleanup);

describe("what-was-the-vote-today", () => {
  // Guards the failure this repo already shipped once: the command file was
  // 0 bytes, `ray build` reported success, and the command was dead on
  // invocation. Rendering the real default export is what catches that —
  // `ray build` never would.
  it("has a default export that renders a List", () => {
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("says the fetch is unimplemented rather than showing a bare empty list", () => {
    render(<Command />);
    const emptyView = screen.getByTestId("empty-view");
    expect(emptyView).toHaveAttribute("data-title", "No votes yet");
    expect(emptyView).toHaveAttribute("data-description", "Fetching today's votes is not implemented yet.");
  });
});
