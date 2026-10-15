import { AppState } from 'react-native';

import { isApiError } from '@/api/client';
import { db } from '@/db/client';
import { onTableChange } from '@/db/live';
import { syncRepo } from '@/db/repos';

import { syncOnce } from './engine';
import { useSyncStatus } from './status-store';
import { apiTransport } from './transport';

// When sync runs (User Flows §6): shortly after a write, when the app comes to the front, every
// minute while it's open, and after a failure with backoff (5 s, 10 s, 20 s … 5 min). There is
// no network listener yet: a failed attempt with a network error is what "offline" means here.
const AFTER_WRITE_MS = 1_500;
const EVERY_MS = 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;

let generation = 0;
let started = false;
let running: Promise<void> | null = null;
let again = false;
let failures = 0;
/** While backing off, triggers wait for the retry timer instead of running at once. */
let nextAttemptAt = 0;
/** The outbox id the last sync started from: only ids above it are new work. */
let seenOutboxId = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let writeTimer: ReturnType<typeof setTimeout> | undefined;
let stopTriggers: (() => void) | undefined;

/** Changes with every start / stop. Work started under an older generation must not land. */
export function syncGeneration(): number {
  return generation;
}

async function run(): Promise<void> {
  const mine = generation;
  const status = useSyncStatus.getState();
  seenOutboxId = syncRepo.latestOutboxId(db);
  status.setSyncing(true);
  try {
    await syncOnce(db, apiTransport, { cancelled: () => mine !== generation });
    if (mine !== generation) return;
    failures = 0;
    nextAttemptAt = 0;
    clearTimeout(retryTimer);
    status.setProblem(null);
    // A write that landed while this sync was running: go again.
    if (syncRepo.latestOutboxId(db) > seenOutboxId) again = true;
  } catch (error) {
    if (mine !== generation) return;
    failures += 1;
    const offline = isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT');
    status.setProblem(offline ? 'offline' : 'server');
    const delay = Math.min(5_000 * 2 ** (failures - 1), MAX_BACKOFF_MS);
    nextAttemptAt = Date.now() + delay;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => requestSync({ force: true }), delay);
    again = false;
  } finally {
    if (mine === generation) status.setSyncing(false);
  }
}

/**
 * Runs a sync now (or right after the one in progress). While backing off after a failure it
 * waits for the retry timer; `force` (Sync now, the retry timer itself) runs regardless.
 */
export function requestSync({ force = false }: { force?: boolean } = {}): void {
  if (!started) return;
  if (!force && Date.now() < nextAttemptAt) return;
  if (running) {
    again = true;
    return;
  }
  running = run().finally(() => {
    running = null;
    if (again) {
      again = false;
      requestSync();
    }
  });
}

/**
 * Stops sync at once: called first thing on sign-out, before the phone is wiped, so an answer
 * still on its way can't write the old shop back. Safe to call twice. Returns whether it was
 * running.
 */
export function stopSync(): boolean {
  if (!started) return false;
  generation += 1;
  started = false;
  again = false;
  stopTriggers?.();
  stopTriggers = undefined;
  clearTimeout(writeTimer);
  clearTimeout(retryTimer);
  useSyncStatus.setState({ syncing: false, problem: null });
  return true;
}

/** Starts the triggers for the signed-in shop. The returned function stops them. */
export function startSync(): () => void {
  stopSync();
  generation += 1;
  started = true;
  failures = 0;
  nextAttemptAt = 0;
  seenOutboxId = syncRepo.latestOutboxId(db);

  // Only new work starts a sync. The outbox also changes when sync itself deletes pushed rows
  // or counts a failed attempt; reacting to those would loop forever while offline.
  const stopWatching = onTableChange('outbox', () => {
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      if (syncRepo.latestOutboxId(db) > seenOutboxId) requestSync();
    }, AFTER_WRITE_MS);
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') requestSync();
  });
  const timer = setInterval(() => {
    if (AppState.currentState === 'active') requestSync();
  }, EVERY_MS);
  stopTriggers = () => {
    stopWatching();
    appState.remove();
    clearInterval(timer);
  };

  requestSync({ force: true });
  return stopSync;
}
