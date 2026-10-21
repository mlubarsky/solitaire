import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '../engine';
import { AUTO_COMPLETE_STEP_MS, useGame } from '../state/useGame';
import { GOD_MODE_STEP_MS, godModeAnimationMs, useGodMode } from '../state/useGodMode';
import { installTestHooks } from '../testHooks';
import { useAnimateBackground, useBackground } from '../themes/useBackground';
import { Background } from './background/Background';
import { Board } from './Board';
import { Celebration } from './Celebration';
import { ConfirmDialog } from './ConfirmDialog';
import { GodModeBanner } from './GodModeBanner';
import { SettingsPanel } from './settings/SettingsPanel';
import { parseSeed, randomSeed } from './seed';
import { computeLayout } from './layout';
import { TopBar } from './TopBar';
import { useReducedMotion, useViewport } from './useMedia';
import { WinDialog } from './WinDialog';

export interface AppProps {
  /** Deal this seed (defaults to `?seed=` in the URL, else random). */
  seed?: number;
  /** Start from this exact position instead of a deal. */
  initialGame?: GameState;
}

function initialFor({ seed, initialGame }: AppProps) {
  if (initialGame) return { game: initialGame };
  return { seed: seed ?? parseSeed(window.location.search) ?? randomSeed() };
}

export function App(props: AppProps) {
  const [initial] = useState(() => initialFor(props));
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [background, setBackground] = useBackground();
  const [animateBackground, setAnimateBackground] = useAnimateBackground();
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    settingsButtonRef.current?.focus();
  }, []);
  const toggleSettings = useCallback(() => setSettingsOpen((open) => !open), []);
  const [celebratedDeal, setCelebratedDeal] = useState<number | null>(null);
  const won = phase === 'won';
  const celebrating = won && !reducedMotion && celebratedDeal !== dealId;
  const showWin = won && !celebrating;

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
  const endCelebration = useCallback(() => setCelebratedDeal(dealId), [dealId]);

  // Ctrl+Z / Cmd+Z undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!confirmOpen && !settingsOpen && !god.active) undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, confirmOpen, settingsOpen, god.active]);

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
      />
      <main className="table">
        <Board
          game={game}
          dealId={dealId}
          layout={layout}
          interactive={phase === 'playing' && !confirmOpen && !settingsOpen && !god.active}
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
      {confirmOpen && <ConfirmDialog onConfirm={startNewGame} onCancel={cancelNewGame} />}
      {celebrating && <Celebration foundations={game.foundations} onDone={endCelebration} />}
      {showWin && <WinDialog score={game.score} moves={game.moves} onPlayAgain={startNewGame} />}
    </div>
  );
}
