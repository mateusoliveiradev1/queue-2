"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties
} from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import type { PlayingNowGameView } from "./view-models";

type PlayOrderMutationResult =
  | {
      ok: true;
      state: string;
      redirectTo?: string;
    }
  | {
      ok: false;
      reason: string;
      state: string;
      redirectTo?: string;
    };

type OrderAction = (formData: FormData) => Promise<PlayOrderMutationResult>;

export function PlayingOrderControls({
  games,
  promoteAction,
  reorderAction
}: {
  games: PlayingNowGameView[];
  promoteAction: OrderAction;
  reorderAction: OrderAction;
}) {
  const [organizing, setOrganizing] = useState(false);
  const [orderedGames, setOrderedGames] = useState(games);
  const [feedbackState, setFeedbackState] = useState<ActionFeedbackState>("idle");
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const itemIds = useMemo(
    () => orderedGames.map((game) => game.libraryGameId),
    [orderedGames]
  );

  useEffect(() => {
    setOrderedGames(games);
  }, [games]);

  async function submitReorder(formData: FormData) {
    setFeedbackState((current) => (current === "failed" ? "retrying" : "syncing"));
    const result = await reorderAction(formData);

    if (result.redirectTo) {
      window.location.assign(result.redirectTo);
      return;
    }

    if (result.ok) {
      setFeedbackState("confirmed");
      setOrganizing(false);
      router.refresh();
      return;
    }

    setFeedbackState("failed");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setOrderedGames((current) => {
      const oldIndex = current.findIndex((game) => game.libraryGameId === active.id);
      const newIndex = current.findIndex((game) => game.libraryGameId === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function moveGame(libraryGameId: string, direction: -1 | 1) {
    setOrderedGames((current) => {
      const oldIndex = current.findIndex((game) => game.libraryGameId === libraryGameId);
      const newIndex = oldIndex + direction;

      if (oldIndex < 0 || newIndex < 0 || newIndex >= current.length) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  if (games.length < 2) {
    return null;
  }

  return (
    <div className="playing-order-controls">
      <button
        className="queue2-button"
        data-tone={organizing ? "primary" : "quiet"}
        onClick={() => {
          setFeedbackState("idle");
          setOrganizing((current) => !current);
        }}
        type="button"
      >
        Organizar
      </button>

      {organizing ? (
        <form action={submitReorder} className="playing-order-form">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <ol className="playing-order-list">
                {orderedGames.map((game, index) => (
                  <SortablePlayingRow
                    game={game}
                    index={index}
                    key={game.libraryGameId}
                    moveGame={moveGame}
                    total={orderedGames.length}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          <div className="playing-order-actions">
            <ActionFeedbackButton
              labels={{
                idle: "Salvar ordem",
                syncing: "Salvando",
                confirmed: "Ordem salva",
                failed: "Tentar de novo",
                retrying: "Tentando"
              }}
              state={feedbackState}
              tone="primary"
            />
            <ActionFeedback
              copy={{
                syncing: "Ordem enviada para a fila.",
                confirmed: "Principal e secundarios atualizados.",
                failed: "Nao deu para salvar a ordem.",
                retrying: "Tentando salvar de novo."
              }}
              state={feedbackState}
            />
          </div>
        </form>
      ) : (
        <div className="playing-promotion-list">
          {games
            .filter((game) => game.role === "secondary")
            .map((game) => (
              <PromotePlayingGameForm
                action={promoteAction}
                game={game}
                key={game.libraryGameId}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function SortablePlayingRow({
  game,
  index,
  moveGame,
  total
}: {
  game: PlayingNowGameView;
  index: number;
  moveGame: (libraryGameId: string, direction: -1 | 1) => void;
  total: number;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: game.libraryGameId });
  const style: CSSProperties = {
    transform: toTransformString(transform),
    transition
  };

  return (
    <li
      className="playing-order-row"
      data-dragging={isDragging ? "true" : "false"}
      ref={setNodeRef}
      style={style}
    >
      <input name="libraryGameId" type="hidden" value={game.libraryGameId} />
      <input name="gameSlug" type="hidden" value={game.slug} />
      <span className="playing-order-position">
        {index === 0 ? "Principal" : `Secundario ${index}`}
      </span>
      <strong>{game.name}</strong>
      <div className="playing-order-buttons">
        <button
          aria-label={`Arrastar ${game.name}`}
          className="queue2-button playing-drag-handle"
          data-tone="quiet"
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <button
          aria-label={`Subir ${game.name}`}
          className="queue2-button"
          data-tone="quiet"
          disabled={index === 0}
          onClick={() => moveGame(game.libraryGameId, -1)}
          type="button"
        >
          ^
        </button>
        <button
          aria-label={`Descer ${game.name}`}
          className="queue2-button"
          data-tone="quiet"
          disabled={index === total - 1}
          onClick={() => moveGame(game.libraryGameId, 1)}
          type="button"
        >
          v
        </button>
      </div>
    </li>
  );
}

function PromotePlayingGameForm({
  action,
  game
}: {
  action: OrderAction;
  game: PlayingNowGameView;
}) {
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const router = useRouter();

  async function submitPromotion(formData: FormData) {
    setState((current) => (current === "failed" ? "retrying" : "syncing"));
    const result = await action(formData);

    if (result.redirectTo) {
      window.location.assign(result.redirectTo);
      return;
    }

    if (result.ok) {
      setState("confirmed");
      router.refresh();
      return;
    }

    setState("failed");
  }

  return (
    <form action={submitPromotion} className="playing-promote-form">
      <input name="libraryGameId" type="hidden" value={game.libraryGameId} />
      <input name="gameSlug" type="hidden" value={game.slug} />
      <ActionFeedbackButton
        labels={{
          idle: `Promover ${game.name}`,
          syncing: "Promovendo",
          confirmed: "Principal atualizado",
          failed: "Tentar de novo",
          retrying: "Tentando"
        }}
        state={state}
        tone="quiet"
      />
      <ActionFeedback
        copy={{
          syncing: "Promocao enviada para a fila.",
          confirmed: "Principal atualizado.",
          failed: "Nao deu para promover.",
          retrying: "Tentando promover de novo."
        }}
        state={state}
      />
    </form>
  );
}

function toTransformString(
  transform: { x: number; y: number; scaleX?: number; scaleY?: number } | null
): string | undefined {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`;
}
