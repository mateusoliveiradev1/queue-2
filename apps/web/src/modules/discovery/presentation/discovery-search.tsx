"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { DiscoveryDeckCard } from "../application/ports";
import { DiscoveryCard } from "./discovery-card";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;
type EnhancedDiscoveryAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; redirectTo?: string }>;

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
  enhancedDecisionAction,
  enhancedHandoffAction,
  handoffAction,
  returnTo
}: {
  decisionAction: DiscoveryDecisionAction;
  enhancedDecisionAction?: EnhancedDiscoveryAction;
  enhancedHandoffAction?: EnhancedDiscoveryAction;
  handoffAction: DiscoveryHandoffAction;
  returnTo: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveryDeckCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<DiscoveryDeckCard | null>(null);
  const [status, setStatus] = useState("Digite ao menos duas letras.");
  const [isLoading, setIsLoading] = useState(false);
  const listboxId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    abortRef.current?.abort();

    if (normalized.length < 2) {
      setResults([]);
      setIsLoading(false);
      setStatus("Digite ao menos duas letras.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setStatus("Buscando no deck...");
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
          setIsLoading(false);
          setStatus("Busca indisponivel agora.");
          return;
        }

        setResults(payload.results);
        setIsLoading(false);
        setStatus(
          payload.results.length > 0
            ? `${payload.results.length} sugestao(oes) para abrir no deck.`
            : "Nada entrou na fila. Tente outro nome ou limpe os filtros antes de buscar de novo."
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setResults([]);
        setIsLoading(false);
        setStatus("Busca indisponivel agora.");
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <section
      aria-labelledby="discovery-search-title"
      className="discovery-search discovery-search-sheet"
      id="discovery-search"
      role="dialog"
    >
      <div className="section-heading">
        <p className="eyebrow">Busca</p>
        <h2 id="discovery-search-title">
          Busca no deck
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
      <p className="muted" data-loading={isLoading ? "true" : "false"} role="status">
        {status}
      </p>
      {results.length > 0 ? (
        <ul className="discovery-search-results" id={listboxId} role="listbox">
          {results.map((card) => (
            <li key={card.catalogGameId}>
              <button
                aria-selected={selectedCard?.catalogGameId === card.catalogGameId}
                className="queue2-button"
                data-tone="quiet"
                onClick={() => {
                  setSelectedCard(card);
                  setStatus(`Carta selecionada: ${card.title}.`);
                }}
                role="option"
                type="button"
              >
                {card.title}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !isLoading ? (
        <p className="discovery-search-empty">Nada entrou na fila.</p>
      ) : null}
      {selectedCard ? (
        <div className="discovery-search-selected">
          <p className="eyebrow">Contexto selecionado</p>
          <DiscoveryCard
            card={selectedCard}
            decisionAction={decisionAction}
            enhancedDecisionAction={enhancedDecisionAction}
            enhancedHandoffAction={enhancedHandoffAction}
            handoffAction={handoffAction}
            reaction={null}
            returnTo={returnTo}
            sourceMode="search"
          />
        </div>
      ) : null}
    </section>
  );
}
