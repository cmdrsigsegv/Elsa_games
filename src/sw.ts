/// <reference lib="webworker" />
// The service worker: keeps a copy of every app file on the phone so the app
// opens with no signal. The file list is filled in at build time.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// A new version waits until the app has been closed, so it never swaps the
// code underneath a puzzle in progress. The Update button on the home screen
// asks it to take over at once.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});
