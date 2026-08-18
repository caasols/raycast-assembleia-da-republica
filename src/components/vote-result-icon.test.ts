import { describe, it, expect } from "vitest";
import { voteResultIcon } from "./vote-result-icon";
import type { Votacao } from "../lib/types";

const vote = (resultado: Votacao["resultado"]): Votacao => ({
  id: "v1",
  data: "2026-08-18",
  resultado,
  unanime: false,
  reuniao: null,
  tipoReuniao: null,
  descricao: null,
  aFavor: [],
  contra: [],
  abstencao: [],
  ausencias: [],
  detalhe: null,
});

describe("voteResultIcon", () => {
  it("tints an approved vote green", () => {
    expect(voteResultIcon(vote("Aprovado"))).toMatchObject({ tintColor: "Green" });
  });

  it("tints a rejected vote red", () => {
    expect(voteResultIcon(vote("Rejeitado"))).toMatchObject({ tintColor: "Red" });
  });

  it("gives Prejudicado neither colour, being neither a pass nor a defeat", () => {
    const icon = voteResultIcon(vote("Prejudicado"));
    expect(icon.tintColor).not.toBe("Green");
    expect(icon.tintColor).not.toBe("Red");
  });
});
