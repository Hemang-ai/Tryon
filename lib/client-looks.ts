export type BrowserLook = {
  id: string;
  userId: string;
  category: string;
  variantName: string;
  variantHex?: string | null;
  createdAt: string;
  imageUrl: string;
};

const DATABASE_NAME = "try-it-on";
const STORE_NAME = "looks";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not be opened."));
  });
}

export async function listBrowserLooks(userId: string) {
  const database = await openDatabase();
  try {
    return await new Promise<BrowserLook[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).index("userId").getAll(userId);
      request.onsuccess = () => resolve((request.result as BrowserLook[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      request.onerror = () => reject(request.error ?? new Error("Saved looks could not be loaded."));
    });
  } finally {
    database.close();
  }
}

export async function saveBrowserLook(look: BrowserLook) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(look);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("This look could not be saved."));
    });
  } finally {
    database.close();
  }
}

export async function deleteBrowserLook(userId: string, id: string) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const lookup = store.get(id);
      lookup.onsuccess = () => {
        const look = lookup.result as BrowserLook | undefined;
        if (look?.userId === userId) store.delete(id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("This look could not be deleted."));
    });
  } finally {
    database.close();
  }
}
