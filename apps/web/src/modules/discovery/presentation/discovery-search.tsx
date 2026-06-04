"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { DiscoveryDeckCard } from "../application/ports";
import { DiscoveryCard } from "./discovery-card";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;

type SearchResponse =
  | {
      ok: true;
      results: DiscoveryDeckCard[];
    }
  | {
      ok: false;
      reason: string;
    };

export function DiscoverySearch({
  decisionAction,
  handoffAction,
  returnTo
}: {
  decisionAction: DiscoveryDecisionAction;
  handoffAction: DiscoveryHandoffAction;
  returnTo: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveryDeckCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<DiscoveryDeckCard | null>(null);
  const [status, setStatus] = useState("Digite ao menos duas letras.");
  const listboxId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    abortRef.current?.abort();

    if (normalized.length < 2) {
      setResults([]);
      setStatus("Digite ao menos duas letras.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          includeSeen: "true",
          limit: "5",
          q: normalized
        });
        const response = await fetch(`/api/discovery/search?${params.toString()}`, {
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });
        const payload = (await response.json()) as SearchResponse;

        if (!payload.ok) {
          setResults([]);
          setStatus("Busca indisponivel agora.");
          return;
        }

        setResults(payload.results);
        setStatus(
          payload.results.length > 0
            ? `${payload.results.length} sugestao(oes) para abrir no deck.`
            : "Nenhuma sugestao encontrada."
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setResults([]);
        setStatus("Busca indisponivel agora.");
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <section className="discovery-search" id="discovery-search" aria-labelledby="discovery-search-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="discovery-search-title">
          Busca
        </h2>
        <p className="support-copy">
          Autocomplete de descoberta: escolher uma sugestao abre a carta com as
          mesmas decisoes do deck.
        </p>
      </div>
      <label className="field" htmlFor="discovery-search-input">
        <span>Buscar jogo</span>
        <input
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={results.length > 0}
          className="queue2-input"
          id="discovery-search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="It Takes Two, puzzle..."
          role="combobox"
          type="search"
          value={query}
        />
      </label>
      <p className="muted" role="status">
        {status}
      </p>
      {results.length > 0 ? (
        <ul className="discovery-search-results" id={listboxId} role="listbox">
          {results.map((card) => (
            <li key={card.catalogGameId} role="option">
              <button
                className="queue2-button"
                data-tone="quiet"
                onClick={() => setSelectedCard(card)}
                type="button"
              >
                {card.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selectedCard ? (
        <div className="discovery-search-selected">
          <DiscoveryCard
            card={selectedCard}
            decisionAction={decisionAction}
            handoffAction={handoffAction}
            reaction={null}
            returnTo={returnTo}
          />
        </div>
      ) : null}
    </section>
  );
}
