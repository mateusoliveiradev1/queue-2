"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";

import type { DiscoveryDeckCard } from "../application/ports";
import { DiscoveryCard } from "./discovery-card";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;
type EnhancedDiscoveryAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; redirectTo?: string }>;
type Reaction = "want" | "not_now" | "skip";
type DiscoveryDeckPagination = {
  currentPage: number;
  nextHref: string | null;
  previousHref: string | null;
};

const reactionStatus: Record<Reaction, string> = {
  want: "Quero jogar enviado. O servidor confirma se virou match.",
  not_now: "Agora nao enviado. O servidor aplica o cooldown sem culpa.",
  skip: "Pular enviado. O servidor avanca a carta sem peso."
};

export function DiscoveryDeck({
  cards,
  decisionAction,
  enhancedDecisionAction,
  enhancedHandoffAction,
  handoffAction,
  pagination,
  returnTo,
  surpriseCatalogGameId
}: {
  cards: DiscoveryDeckCard[];
  decisionAction: DiscoveryDecisionAction;
  enhancedDecisionAction?: EnhancedDiscoveryAction;
  enhancedHandoffAction?: EnhancedDiscoveryAction;
  handoffAction: DiscoveryHandoffAction;
  pagination: DiscoveryDeckPagination;
  returnTo: string;
  surpriseCatalogGameId?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const activeIndex = 0;
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const wantFormRef = useRef<HTMLFormElement | null>(null);
  const notNowFormRef = useRef<HTMLFormElement | null>(null);
  const skipFormRef = useRef<HTMLFormElement | null>(null);
  const activeCard = cards[activeIndex] ?? null;
  const nextCards = useMemo(
    () => cards.slice(activeIndex + 1, activeIndex + 3),
    [activeIndex, cards]
  );

  if (!activeCard) {
    return (
      <div
        aria-label="Fim do deck de descoberta"
        aria-live="polite"
        className="empty-state discovery-deck-empty"
        role="status"
      >
        <strong>Voce chegou ao fim do deck por enquanto</strong>
        <span>
          Suas decisoes foram salvas. Agora a descoberta espera a outra pessoa
          da dupla votar tambem; quando os dois marcam Quero jogar no mesmo
          jogo, ele aparece em Matches recentes para ir para Wishlist, Jogando
          ou Pausado.
        </span>
        <span className="discovery-deck-empty-note">
          Se quiser continuar agora, use Busca, ajuste Filtros ou veja os
          matches que ja aconteceram.
        </span>
        <div className="discovery-deck-empty-actions" aria-label="Proximos passos da descoberta">
          {pagination.nextHref ? (
            <a className="queue2-button" data-tone="primary" href={pagination.nextHref}>
              Ver mais cartas
            </a>
          ) : (
            <a className="queue2-button" data-tone="primary" href="#discovery-search">
              Buscar jogo
            </a>
          )}
          <a className="queue2-button" data-tone="quiet" href="#discovery-filters-panel">
            Ajustar filtros
          </a>
          <a className="queue2-button" data-tone="quiet" href="#match-history-title">
            Ver matches
          </a>
        </div>
      </div>
    );
  }

  function submitDecision(decision: Reaction) {
    const form =
      decision === "want"
        ? wantFormRef.current
        : decision === "not_now"
          ? notNowFormRef.current
          : skipFormRef.current;

    setReaction(decision);
    form?.requestSubmit();
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (shouldReduceMotion) {
      return;
    }

    if (info.offset.x > 120) {
      submitDecision("want");
      return;
    }

    if (info.offset.x < -120) {
      submitDecision("not_now");
      return;
    }

    if (info.offset.y > 130) {
      submitDecision("skip");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      submitDecision("want");
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      submitDecision("not_now");
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      submitDecision("skip");
    }
  }

  return (
    <div
      className="discovery-deck"
      onKeyDown={handleKeyDown}
      role="group"
      tabIndex={0}
      aria-label="Deck de descoberta. Use os botoes ou setas direita, esquerda e baixo."
    >
      <div className="discovery-deck-stack" aria-live="polite">
        {nextCards.map((card, index) => (
          <article
            aria-hidden="true"
            className="discovery-card discovery-card-preview"
            key={card.catalogGameId}
            style={{ transform: `translateY(${(index + 1) * 12}px) scale(${1 - (index + 1) * 0.035})` }}
          >
            <strong>{card.title}</strong>
          </article>
        ))}

        <motion.div
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { rotate: reaction === "want" ? 3 : reaction === "not_now" ? -3 : 0, x: 0, y: 0 }
          }
          className="discovery-card-motion"
          drag={shouldReduceMotion ? false : true}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.18}
          initial={shouldReduceMotion ? { opacity: 1 } : { y: 18 }}
          key={activeCard.catalogGameId}
          onDragEnd={handleDragEnd}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          whileDrag={shouldReduceMotion ? undefined : { scale: 1.015 }}
        >
          <DiscoveryCard
            card={activeCard}
            decisionAction={decisionAction}
            enhancedDecisionAction={enhancedDecisionAction}
            enhancedHandoffAction={enhancedHandoffAction}
            formRefs={{
              want: wantFormRef,
              not_now: notNowFormRef,
              skip: skipFormRef
            }}
            handoffAction={handoffAction}
            onLocalReaction={setReaction}
            priority
            reaction={reaction}
            returnTo={returnTo}
            sourceMode={
              activeCard.catalogGameId === surpriseCatalogGameId
                ? "surprise"
                : "deck"
            }
          />
        </motion.div>
      </div>
      <div className="discovery-deck-status" aria-live="polite">
        {reaction ? (
          <p>{reactionStatus[reaction]}</p>
        ) : shouldReduceMotion ? (
          <p>
            Movimento reduzido ativo. Use os botoes ou as setas para decidir
            com resposta imediata.
          </p>
        ) : (
          <p>Arraste a carta ou use os botoes. A proxima carta ja fica preparada.</p>
        )}
        {nextCards[0] ? (
          <p className="discovery-next-card-copy">
            Proxima carta no trilho: {nextCards[0].title}
          </p>
        ) : null}
      </div>
      <p className="discovery-keyboard-hint">
        Setas: direita Quero jogar, esquerda Agora nao, baixo Pular.
      </p>
      <nav className="deck-pagination" aria-label="Paginas do deck de descoberta">
        <span>Pagina {pagination.currentPage}</span>
        {pagination.previousHref ? (
          <a className="queue2-button" data-tone="quiet" href={pagination.previousHref}>
            Anterior
          </a>
        ) : null}
        {pagination.nextHref ? (
          <a className="queue2-button" data-tone="quiet" href={pagination.nextHref}>
            Mais cartas
          </a>
        ) : null}
      </nav>
    </div>
  );
}
