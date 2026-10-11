// Getting a new version of the app onto the phone.
//
// The service worker keeps a copy of the app so it opens offline. When a new
// version is published, the phone downloads it in the background, but keeps
// running the old one until every window of the app has been closed. These
// two functions let the home screen skip that wait: look for a new version,
// and switch to it now.

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  try {
    return await navigator.serviceWorker?.getRegistration();
  } catch {
    return undefined;
  }
}

/** Asks the server for a new version. True when one is downloaded and ready to switch to. */
export async function findUpdate(): Promise<boolean> {
  const reg = await registration();
  if (!reg) return false;
  if (reg.waiting) return true;
  try {
    await reg.update();
  } catch {
    return false; // offline
  }
  if (reg.waiting) return true;
  const incoming = reg.installing;
  if (!incoming) return false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 30_000);
    incoming.addEventListener('statechange', () => {
      if (incoming.state !== 'installed' && incoming.state !== 'redundant') return;
      clearTimeout(timer);
      // On the very first visit a worker installs too, but it is not an update.
      resolve(incoming.state === 'installed' && navigator.serviceWorker.controller !== null);
    });
  });
}

/** Switches to the downloaded version and reloads the app. Saved games are not touched. */
export async function applyUpdate(): Promise<void> {
  const reg = await registration();
  if (!reg?.waiting) return location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}
