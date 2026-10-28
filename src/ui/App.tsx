import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '../engine';
import { AUTO_COMPLETE_STEP_MS, useGame } from '../state/useGame';
import { GOD_MODE_STEP_MS, godModeAnimationMs, useGodMode } from '../state/useGodMode';
import { installTestHooks } from '../testHooks';
import type { ThemeId } from '../themes/themes';
import { useAnimateBackground, useBackground } from '../themes/useBackground';
import { Background } from './background/Background';
import { Board } from './Board';
import { Confetti } from './Confetti';
import { ConfirmDialog } from './ConfirmDialog';
import { GodModeBanner } from './GodModeBanner';
import { SettingsPanel } from './settings/SettingsPanel';
import { TablePicker } from './settings/TablePicker';
import { RulesDialog } from './RulesDialog';
import { parseSeed, randomSeed } from './seed';
import { computeLayout } from './layout';
import { TitleScreen } from './title/TitleScreen';
import { TopBar } from './TopBar';
import { useReducedMotion, useViewport } from './useMedia';
import { WinDialog } from './WinDialog';

export interface AppProps {
  /** Deal this seed (defaults to `?seed=` in the URL, else random). */
  seed?: number;
  /** Start from this exact position instead of a deal. */
  initialGame?: GameState;
}

/**
 * The title screen shows when the app starts, unless a specific game was asked for: a deal
 * link (`?seed=`) or a seed/position passed in (tests) goes straight to the board.
 */
function startsOnTitle({ seed, initialGame }: AppProps): boolean {
  return seed === undefined && !initialGame && parseSeed(window.location.search) === null;
}

function initialFor({ seed, initialGame }: AppProps) {
  if (initialGame) return { game: initialGame };
  return { seed: seed ?? parseSeed(window.location.search) ?? randomSeed() };
}

export function App(props: AppProps) {
  const [initial] = useState(() => initialFor(props));
  const [onTitle, setOnTitle] = useState(() => startsOnTitle(props));
  const [background, setBackground] = useBackground();
  const leaveTitle = useCallback(
    (table: ThemeId) => {
      setBackground(table);
      setOnTitle(false);
    },
    [setBackground],
  );
  const [godDelay, setGodDelay] = useState(GOD_MODE_STEP_MS);
  const autoCompleteMs = useRef(AUTO_COMPLETE_STEP_MS);
  const api = useGame(initial, autoCompleteMs);
  const { state, undo, newGame, loadState } = api;
  const { game, phase, dealId } = state;
  const god = useGodMode({ game, phase, dealId, tryMove: api.tryMove, delayMs: godDelay });
  const canUndo = api.canUndo && !god.active;
  // While god mode runs, auto-complete plays at god-mode pace too.
  useEffect(() => {
    autoCompleteMs.current = god.active ? godDelay : AUTO_COMPLETE_STEP_MS;
  });

  const viewport = useViewport();
  const layout = useMemo(
    () => computeLayout(viewport.width, viewport.height),
    [viewport.width, viewport.height],
  );
  const reducedMotion = useReducedMotion();

  const [confirmOpen, setConfirmOpen] = useState(false);
  /** At most one panel or dialog of the top bar is open at a time. */
  const [overlay, setOverlay] = useState<'settings' | 'tables' | 'rules' | null>(null);
  const settingsOpen = overlay === 'settings';
  const tablePickerOpen = overlay === 'tables';
  const rulesOpen = overlay === 'rules';
  const [animateBackground, setAnimateBackground] = useAnimateBackground();
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => {
    setOverlay(null);
    settingsButtonRef.current?.focus();
  }, []);
  const toggleSettings = useCallback(
    () => setOverlay((open) => (open === 'settings' ? null : 'settings')),
    [],
  );
  const toggleTablePicker = useCallback(
    () => setOverlay((open) => (open === 'tables' ? null : 'tables')),
    [],
  );
  const openRules = useCallback(() => setOverlay('rules'), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);
  const overlayOpen = overlay !== null;
  const [celebratedDeal, setCelebratedDeal] = useState<number | null>(null);
  const won = phase === 'won';
  // The win dialog shows at once; confetti falls over it (once per win, never under reduced motion).
  const showConfetti = won && !reducedMotion && celebratedDeal !== dealId;
  const showWin = won;

  const startNewGame = useCallback(() => {
    setConfirmOpen(false);
    newGame(randomSeed());
  }, [newGame]);

  const { stop: stopGodMode, start: startGodMode } = god;
  const requestNewGame = useCallback(() => {
    stopGodMode();
    if (phase !== 'won' && game.moves > 0) setConfirmOpen(true);
    else startNewGame();
  }, [phase, game.moves, startNewGame, stopGodMode]);

  const playGodMode = useCallback(() => {
    closeSettings();
    startGodMode();
  }, [closeSettings, startGodMode]);

  const cancelNewGame = useCallback(() => setConfirmOpen(false), []);
  const endConfetti = useCallback(() => setCelebratedDeal(dealId), [dealId]);

  // Ctrl+Z / Cmd+Z undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!confirmOpen && !overlayOpen && !god.active) undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, confirmOpen, overlayOpen, god.active]);

  // Dev/test-only hooks for Playwright.
  const latestGame = useRef(game);
  useEffect(() => {
    latestGame.current = game;
  });
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    return installTestHooks({
      getState: () => latestGame.current,
      loadState: (next) => {
        setConfirmOpen(false);
        loadState(next);
      },
      newGame: (seed) => {
        setConfirmOpen(false);
        newGame(seed ?? randomSeed());
      },
      setGodModeDelay: setGodDelay,
    });
  }, [loadState, newGame]);

  if (onTitle) {
    return (
      <TitleScreen
        table={background}
        onPlay={leaveTitle}
        reducedMotion={reducedMotion}
        animate={animateBackground}
      />
    );
  }

  const appStyle = { '--topbar-h': `${layout.topBarHeight}px` } as CSSProperties;

  return (
    <div className={`app${reducedMotion ? ' reduced-motion' : ''}`} style={appStyle}>
      <Background theme={background} animate={animateBackground && !reducedMotion} />
      <TopBar
        score={game.score}
        moves={game.moves}
        canUndo={canUndo}
        onUndo={undo}
        onUndoAll={api.undoAll}
        onNewGame={requestNewGame}
        settingsOpen={settingsOpen}
        onToggleSettings={toggleSettings}
        settingsButtonRef={settingsButtonRef}
        onOpenRules={openRules}
        tablePickerOpen={tablePickerOpen}
        onToggleTablePicker={toggleTablePicker}
      />
      <main className="table">
        <Board
          game={game}
          dealId={dealId}
          layout={layout}
          interactive={phase === 'playing' && !confirmOpen && !overlayOpen && !god.active}
          reducedMotion={reducedMotion}
          moveMs={god.active ? godModeAnimationMs(godDelay) : undefined}
          onStockClick={api.drawOrRecycle}
          onAutoMove={api.autoMoveCard}
          onTryMove={api.tryMove}
        />
      </main>
      <GodModeBanner
        status={god.status}
        finishing={phase === 'autocompleting'}
        step={god.step}
        total={god.total}
        message={god.message}
        delayMs={godDelay}
        onDelayChange={setGodDelay}
        onStop={god.stop}
        onDismiss={god.dismissMessage}
      />
      <div className="sr-only" aria-live="polite">
        {showWin ? `You win! Score ${game.score}, ${game.moves} moves.` : ''}
      </div>
      {settingsOpen && (
        <SettingsPanel
          background={background}
          onSelectBackground={setBackground}
          animateBackground={animateBackground}
          onAnimateBackgroundChange={setAnimateBackground}
          godModeActive={god.active}
          godModeAvailable={phase === 'playing'}
          onStartGodMode={playGodMode}
          onStopGodMode={god.stop}
          onClose={closeSettings}
        />
      )}
      {tablePickerOpen && (
        <TablePicker
          background={background}
          onSelectBackground={setBackground}
          onClose={closeOverlay}
        />
      )}
      {rulesOpen && <RulesDialog onClose={closeOverlay} />}
      {confirmOpen && <ConfirmDialog onConfirm={startNewGame} onCancel={cancelNewGame} />}
      {showWin && <WinDialog score={game.score} moves={game.moves} onPlayAgain={startNewGame} />}
      {showConfetti && <Confetti onDone={endConfetti} />}
    </div>
  );
}
