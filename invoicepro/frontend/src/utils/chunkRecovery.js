const RELOAD_KEY = 'invoicepro_chunk_reload_attempted';

const staleChunkPatterns = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Expected a JavaScript-or-Wasm module script',
  'Loading chunk',
  'ChunkLoadError'
];

const isStaleChunkError = (value) => {
  const message = String(value?.message || value?.reason?.message || value || '');
  return staleChunkPatterns.some((pattern) => message.includes(pattern));
};

const recoverFromStaleChunk = () => {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return;
  }

  window.location.reload();
};

export const installChunkRecovery = () => {
  window.addEventListener('error', (event) => {
    if (isStaleChunkError(event.error) || isStaleChunkError(event.message)) {
      recoverFromStaleChunk();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkError(event.reason)) {
      recoverFromStaleChunk();
    }
  });
};
