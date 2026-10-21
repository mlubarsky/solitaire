import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  ALL_FOUNDATIONS,
  ALL_TABLEAU,
  WASTE,
  getPile,
  parsePileKey,
  pileEquals,
  pileKey,
  type GameState,
  type Move,
  type PileId,
} from '../engine';
import { columnHeight, fanOffsets, wasteRect, type Layout, type Point } from './layout';
import { FoundationPile, StockPile, TableauPile, WastePile } from './Pile';
import { useDrag, type DropInfo } from './useDrag';
import { useFlip } from './useFlip';

export const SHAKE_MS = 320;

interface CardRef {
  pile: PileId;
  index: number;
}

export interface BoardProps {
  game: GameState;
  dealId: number;
  layout: Layout;
  /** False during auto-complete and after a win: all input is ignored. */
  interactive: boolean;
  reducedMotion: boolean;
  /** Card move animation length (shorter or longer while god mode plays). */
  moveMs?: number;
  onStockClick: () => void;
  onAutoMove: (pile: PileId, index: number) => boolean;
  onTryMove: (move: Move) => boolean;
}

function BoardView(props: BoardProps) {
  const { game, dealId, layout, interactive, reducedMotion, moveMs } = props;
  const { onStockClick, onAutoMove, onTryMove } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const pileEls = useRef(new Map<string, HTMLElement>());
  const [shake, setShake] = useState<{ ids: ReadonlySet<string>; key: number }>({
    ids: new Set(),
    key: 0,
  });

  const registerPile = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) pileEls.current.set(key, el);
      else pileEls.current.delete(key);
    },
    [],
  );
  const pileRefs = useMemo(() => {
    const keys = ['stock', 'waste', ...ALL_FOUNDATIONS.map(pileKey), ...ALL_TABLEAU.map(pileKey)];
    return new Map(keys.map((k) => [k, registerPile(k)]));
  }, [registerPile]);
  const refFor = (key: string) => pileRefs.get(key) as (el: HTMLElement | null) => void;

  const resetKey = `${dealId}|${layout.cardWidth}|${layout.viewportWidth}|${layout.viewportHeight}`;
  const flip = useFlip(rootRef, game, resetKey, reducedMotion, moveMs);

  // Clear the shake class once the animation has played.
  useEffect(() => {
    if (shake.ids.size === 0) return;
    const id = setTimeout(() => setShake((s) => ({ ids: new Set(), key: s.key })), SHAKE_MS);
    return () => clearTimeout(id);
  }, [shake]);

  const onDrop = useCallback(
    ({ source, cardIds, target, rects }: DropInfo<CardRef>) => {
      const to = target === null ? null : parsePileKey(target);
      const move: Move | null =
        to && !pileEquals(to, source.pile)
          ? { type: 'transfer', from: source.pile, to, count: cardIds.length }
          : null;
      if (move && onTryMove(move)) {
        flip.setPending(rects);
      } else {
        flip.animateBack(rects);
      }
    },
    [flip, onTryMove],
  );

  const drag = useDrag<CardRef>({
    getRoot: () => rootRef.current,
    getTargets: () =>
      [...pileEls.current.entries()]
        .filter(([key]) => key.startsWith('f') || key.startsWith('t'))
        .map(([id, el]) => {
          const r = el.getBoundingClientRect();
          return { id, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
        }),
    onDrop,
  });

  const stackIds = useCallback(
    (pile: PileId, index: number): string[] =>
      (getPile(game, pile) ?? []).slice(index).map((c) => c.id),
    [game],
  );

  const handlersFor = (pile: PileId) => ({
    onCardPointerDown: (index: number, event: PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      drag.startPress(event, { source: { pile, index }, cardIds: stackIds(pile, index) });
    },
    onCardActivate: (index: number) => {
      if (!interactive || drag.consumeClick()) return;
      if (!onAutoMove(pile, index)) {
        setShake((s) => ({ ids: new Set(stackIds(pile, index)), key: s.key + 1 }));
      }
    },
  });

  const { cardWidth, cardHeight, tableauY, tableauMaxHeight } = layout;
  const at = (p: Point, height = cardHeight, width = cardWidth): CSSProperties => ({
    left: p.x,
    top: p.y,
    width,
    height,
  });
  const common = { interactive, shakingIds: shake.ids };
  const waste = wasteRect(layout);

  const boardStyle = {
    height: layout.boardHeight,
    '--card-w': `${cardWidth}px`,
    '--card-h': `${cardHeight}px`,
  } as CSSProperties;

  return (
    <div className="board" ref={rootRef} style={boardStyle} data-testid="board">
      <StockPile
        cards={game.stock}
        wasteCount={game.waste.length}
        style={at(layout.stock)}
        pileRef={refFor('stock')}
        disabled={!interactive}
        onClick={() => {
          if (interactive) onStockClick();
        }}
      />
      <WastePile
        {...common}
        {...handlersFor(WASTE)}
        pileKey="waste"
        cards={game.waste}
        fanDx={layout.wasteFan.dx}
        fanDy={layout.wasteFan.dy}
        style={at(layout.waste, waste.height, waste.width)}
        pileRef={refFor('waste')}
      />
      {ALL_FOUNDATIONS.map((f, i) => (
        <FoundationPile
          {...common}
          {...handlersFor(f)}
          key={pileKey(f)}
          pileKey={pileKey(f)}
          index={i}
          cards={game.foundations[i as 0]}
          style={at(layout.foundations[i] as Point)}
          pileRef={refFor(pileKey(f))}
        />
      ))}
      {ALL_TABLEAU.map((t, i) => {
        const cards = game.tableau[i as 0];
        const offsets = fanOffsets(cards, cardHeight, tableauMaxHeight);
        return (
          <TableauPile
            {...common}
            {...handlersFor(t)}
            key={pileKey(t)}
            pileKey={pileKey(t)}
            index={i}
            cards={cards}
            offsets={offsets}
            style={at(
              { x: layout.tableauX[i] as number, y: tableauY },
              columnHeight(offsets, cardHeight),
            )}
            pileRef={refFor(pileKey(t))}
          />
        );
      })}
    </div>
  );
}

export const Board = memo(BoardView);
