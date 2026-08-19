/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { List } from "@raycast/api";
import { LegislatureDropdown } from "./legislature-dropdown";

afterEach(cleanup);

const LIST = [
  { id: "XV", nome: "XV Legislatura" },
  { id: "XVI", nome: "XVI Legislatura" },
  { id: "XVII", nome: "XVII Legislatura" },
];

function renderDropdown(value = "XVII", onChange = vi.fn()) {
  render(<List searchBarAccessory={<LegislatureDropdown legislatures={LIST} value={value} onChange={onChange} />} />);
  return { select: screen.getByTestId("dropdown"), onChange };
}

describe("LegislatureDropdown", () => {
  it("always offers the unfiltered option", () => {
    renderDropdown();
    expect(screen.getByText("All legislatures")).toBeInTheDocument();
  });

  it("lists newest first, since recent legislatures are what lookups are about", () => {
    renderDropdown();
    const titles = screen.getAllByRole("option").map((o) => o.textContent);
    expect(titles).toEqual(["All legislatures", "XVII Legislatura", "XVI Legislatura", "XV Legislatura"]);
  });

  it("reports the chosen legislature", () => {
    const { select, onChange } = renderDropdown();
    fireEvent.change(select, { target: { value: "XV" } });
    expect(onChange).toHaveBeenCalledWith("XV");
  });

  it("falls back to the id when a legislature has no name", () => {
    render(
      <List
        searchBarAccessory={
          <LegislatureDropdown legislatures={[{ id: "Constituinte", nome: "" }]} value="" onChange={vi.fn()} />
        }
      />,
    );
    expect(screen.getByText("Constituinte")).toBeInTheDocument();
  });
});
