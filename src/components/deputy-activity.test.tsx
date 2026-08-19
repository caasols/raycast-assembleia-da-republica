/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "../lib/errors";

const mocks = vi.hoisted(() => ({ getDeputadoAtividade: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getDeputadoAtividade: mocks.getDeputadoAtividade }));

import { DeputyActivity } from "./deputy-activity";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const detail = () => screen.getByTestId("detail");

describe("DeputyActivity", () => {
  it("shows the name while loading rather than a blank pane", () => {
    mocks.getDeputadoAtividade.mockReturnValue(new Promise(() => {}));
    render(<DeputyActivity id={7} name="António Filipe" />);
    expect(detail().getAttribute("data-markdown")).toContain("António Filipe");
  });

  it("passes the legislature through so a long career is not fetched whole", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({ iniciativas: [{}] });
    render(<DeputyActivity id={7} name="X" legislature="XVII" />);
    await waitFor(() => expect(mocks.getDeputadoAtividade).toHaveBeenCalledWith(7, "XVII"));
  });

  it("summarises the activity by category", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({ iniciativas: [{}, {}], intervencoes: [{}] });
    render(<DeputyActivity id={7} name="X" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("**2** initiatives authored"));
  });

  it("says why there is no individual voting record", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({ iniciativas: [{}] });
    render(<DeputyActivity id={7} name="X" />);
    await waitFor(() =>
      expect(detail().getAttribute("data-markdown")).toContain("recorded per party rather than per deputy"),
    );
  });

  it("can retry a failed load", async () => {
    mocks.getDeputadoAtividade.mockRejectedValue(new OpenArError("boom", 502));
    render(<DeputyActivity id={7} name="X" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("Could not load"));
    const retry = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Retry");
    mocks.getDeputadoAtividade.mockResolvedValue({ iniciativas: [{}] });
    fireEvent.click(retry as HTMLElement);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("initiatives authored"));
  });
});
