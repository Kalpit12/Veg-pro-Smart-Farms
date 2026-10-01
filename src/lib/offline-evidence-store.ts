/**
 * IndexedDB blob store for offline scout/spray photo evidence.
 * Queue items hold blobKey; sync uploads then clears the blob.
 */

const DB_NAME = "vegpro-offline-evidence";
const STORE = "blobs";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function putEvidenceBlob(
  key: string,
  blob: Blob,
  meta: { fileName: string; contentType: string },
) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, ...meta }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
  });
}

export async function getEvidenceBlob(key: string): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
} | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const row = req.result as
        | { blob: Blob; fileName: string; contentType: string }
        | undefined;
      resolve(row ?? null);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
  });
}

export async function deleteEvidenceBlob(key: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

export function blobToFile(
  blob: Blob,
  fileName: string,
  contentType: string,
): File {
  return new File([blob], fileName, { type: contentType || blob.type });
}
