export const ACCEPTED_DOCUMENT_EXTENSIONS = ["pdf", "docx"] as const;
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

const DB_NAME = "maestria-lab.local";
const DB_VERSION = 1;
const STORE_NAME = "source-documents";

export type StoredSourceDocument = {
  moduleId: string;
  file: File;
};

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateSourceDocument(file: File): string | null {
  const extension = getExtension(file.name);

  if (!ACCEPTED_DOCUMENT_EXTENSIONS.includes(extension as (typeof ACCEPTED_DOCUMENT_EXTENSIONS)[number])) {
    return "El documento debe ser PDF o DOCX.";
  }

  if (file.size <= 0) {
    return "El archivo está vacío.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "El documento supera el límite de 50 MB.";
  }

  return null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "moduleId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir el almacenamiento local."));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("La operación de almacenamiento falló."));
    transaction.onabort = () => reject(transaction.error ?? new Error("La operación de almacenamiento fue cancelada."));
  });
}

export async function saveSourceDocument(moduleId: string, file: File) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ moduleId, file } satisfies StoredSourceDocument);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function readSourceDocument(moduleId: string): Promise<File | null> {
  const database = await openDatabase();
  try {
    return await new Promise<File | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(moduleId);
      request.onsuccess = () => {
        const result = request.result as StoredSourceDocument | undefined;
        resolve(result?.file ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error("No se pudo leer el documento local."));
    });
  } finally {
    database.close();
  }
}

export async function deleteSourceDocument(moduleId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(moduleId);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export function formatDocumentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
}

export function documentKindFromName(fileName: string): "PDF" | "DOCX" {
  return getExtension(fileName) === "docx" ? "DOCX" : "PDF";
}

export function titleFromFileName(fileName: string) {
  return fileName.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
