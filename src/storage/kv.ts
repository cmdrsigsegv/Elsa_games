// Everything the app remembers lives in one IndexedDB key-value store on the
// phone. If the browser has no usable IndexedDB (private mode, tests), it
// falls back to memory so the app still runs, just without remembering.

const DB_NAME = 'elsas-games';
const STORE = 'kv';

const memory = new Map<string, unknown>();
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const request = work(db.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function load<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T;
  const value = await run<T>('readonly', (s) => s.get(key));
  if (value !== undefined) memory.set(key, value);
  return value;
}

export async function save(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  await run('readwrite', (s) => s.put(value, key));
}

export async function remove(key: string): Promise<void> {
  memory.delete(key);
  await run('readwrite', (s) => s.delete(key));
}

/** Asks the browser not to clear our data when the phone runs low on space. */
export function keepStorage() {
  void navigator.storage?.persist?.().catch(() => false);
}
