"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";

import type { DiscoveryDeckCard } from "../application/ports";
import { DiscoveryCard } from "./discovery-card";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;
type Reaction = "want" | "not_now" | "skip";

export function DiscoveryDeck({
  cards,
  decisionAction,
  handoffAction,
  returnTo
}: {
  cards: DiscoveryDeckCard[];
  decisionAction: DiscoveryDecisionAction;
  handoffAction: DiscoveryHandoffAction;
  returnTo: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
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
      <div className="empty-state discovery-deck-empty">
        <strong>Sem cartas prontas para este filtro</strong>
        <span>
          Ajuste os filtros, use Busca ou volte quando a sincronizacao trouxer
          mais coops com fonte.
        </span>
      </div>
    );
  }

  function submitDecision(decision: Reaction) {
    setReaction(decision);
    setActiveIndex((current) => Math.min(cards.length, current + 1));

    window.setTimeout(
      () => {
        const form =
          decision === "want"
            ? wantFormRef.current
            : decision === "not_now"
              ? notNowFormRef.current
              : skipFormRef.current;

        form?.requestSubmit();
      },
      shouldReduceMotion ? 0 : 120
    );
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
              : { opacity: 1, rotate: reaction === "want" ? 3 : reaction === "not_now" ? -3 : 0, x: 0, y: 0 }
          }
          className="discovery-card-motion"
          drag={shouldReduceMotion ? false : true}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.18}
          initial={shouldReduceMotion ? { opacity: 0.92 } : { opacity: 0, y: 18 }}
          key={activeCard.catalogGameId}
          onDragEnd={handleDragEnd}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          whileDrag={shouldReduceMotion ? undefined : { scale: 1.015 }}
        >
          <DiscoveryCard
            card={activeCard}
            decisionAction={decisionAction}
            formRefs={{
              want: wantFormRef,
              not_now: notNowFormRef,
              skip: skipFormRef
            }}
            handoffAction={handoffAction}
            priority
            reaction={reaction}
            returnTo={returnTo}
          />
        </motion.div>
      </div>
      <p className="discovery-keyboard-hint">
        Setas: direita Quero jogar, esquerda Agora nao, baixo Pular.
      </p>
    </div>
  );
}
