/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { OpenArError } from "../lib/errors";

const mocks = vi.hoisted(() => ({ getDeputado: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getDeputado: mocks.getDeputado }));

import { DeputyDetail } from "./deputy-detail";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const DEPUTY = {
  id: 4321,
  depId: 99,
  nomeParlamentar: "Pedro Nuno Santos",
  nomeCompleto: "Pedro Nuno de Oliveira Santos",
  grupoParlamentar: "PS",
  circuloEleitoral: "Lisboa",
  legislaturaId: "XVII",
  situacao: "Efetivo",
  updatedAt: "2026-08-01T00:00:00Z",
  dataNascimento: null,
  sexo: null,
  profissao: null,
  mandatos: [],
  bio: null,
  stats: { total: 40, aprovadas: 12, por_tipo: null },
  iniciativas: [],
};

const detail = () => screen.getByTestId("detail");

describe("DeputyDetail", () => {
  it("shows the name it was handed while loading", () => {
    mocks.getDeputado.mockReturnValue(new Promise(() => {}));
    render(<DeputyDetail id={4321} name="Pedro Nuno Santos" />);
    expect(detail().getAttribute("data-markdown")).toContain("Pedro Nuno Santos");
    expect(detail()).toHaveAttribute("data-loading", "true");
  });

  it("fetches the deputy it was given", async () => {
    mocks.getDeputado.mockResolvedValue(DEPUTY);
    render(<DeputyDetail id={4321} name="x" />);
    await waitFor(() => expect(mocks.getDeputado).toHaveBeenCalledWith(4321));
  });

  it("renders the record the list could not show", async () => {
    mocks.getDeputado.mockResolvedValue(DEPUTY);
    render(<DeputyDetail id={4321} name="x" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("**40** initiatives authored"));
  });

  it("says the load failed, keeping the name", async () => {
    mocks.getDeputado.mockRejectedValue(new OpenArError("not found", 404));
    render(<DeputyDetail id={4321} name="Pedro Nuno Santos" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("Could not load this deputy"));
    expect(detail().getAttribute("data-markdown")).toContain("Pedro Nuno Santos");
  });
});
