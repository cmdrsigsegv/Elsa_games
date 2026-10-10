/// <reference lib="webworker" />
// The service worker: keeps a copy of every app file on the phone so the app
// opens with no signal. The file list is filled in at build time.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// No skipWaiting: a new version waits until the app has been closed, so it
// never swaps the code underneath a puzzle in progress.
