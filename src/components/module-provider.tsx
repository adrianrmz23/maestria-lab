"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { seedModules, type ModuleStatus, type SourceDocumentMeta, type StudyModule } from "@/lib/mock-data";
import {
  attachCloudDocument,
  createCloudModule,
  detachCloudDocument,
  getCloudDocumentUrl,
  getCloudModules,
  getCloudStatus,
  importCloudModule,
  removeCloudModule,
  retryCloudExtraction,
  type CloudStatus,
  updateCloudModule,
} from "@/lib/cloud-api";
import { documentKindFromName, deleteSourceDocument, readSourceDocument, saveSourceDocument } from "@/lib/document-storage";
import { slugifyModuleTitle } from "@/lib/module-utils";

const STORAGE_KEY = "maestria-lab.modules.v1";

type CreateModuleInput = {
  title: string;
  subject: string;
  description?: string;
};

type UpdateModuleInput = Partial<Pick<StudyModule, "title" | "subject" | "description" | "progress" | "topics" | "status">>;

type MigrationResult = {
  migrated: number;
  documents: number;
  failed: number;
  errors: string[];
};

type ModuleContextValue = {
  modules: StudyModule[];
  hydrated: boolean;
  persistence: "local" | "cloud";
  cloudStatus: CloudStatus | null;
  cloudError: string;
  migrationCandidates: StudyModule[];
  migrationBusy: boolean;
  createModule: (input: CreateModuleInput) => Promise<StudyModule>;
  updateModule: (id: string, input: UpdateModuleInput) => Promise<void>;
  archiveModule: (id: string) => Promise<void>;
  restoreModule: (id: string) => Promise<void>;
  removeModule: (id: string) => Promise<void>;
  attachSourceDocument: (id: string, file: File) => Promise<SourceDocumentMeta>;
  detachSourceDocument: (id: string) => Promise<void>;
  retrySourceExtraction: (id: string) => Promise<SourceDocumentMeta | undefined>;
  getSourceDocumentUrl: (id: string, download?: boolean) => Promise<string | null>;
  migrateLocalData: () => Promise<MigrationResult>;
  refreshModules: () => Promise<void>;
};

const ModuleContext = createContext<ModuleContextValue | null>(null);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `module-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSourceDocumentMeta(value: unknown): value is SourceDocumentMeta {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SourceDocumentMeta>;
  return Boolean(
    typeof candidate.name === "string" &&
    (candidate.kind === "PDF" || candidate.kind === "DOCX") &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.lastModified === "number" &&
    typeof candidate.addedAt === "string"
  );
}

function normalizeStoredModules(value: unknown): StudyModule[] | null {
  if (!Array.isArray(value)) return null;
  const safe = value.filter((item): item is StudyModule => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<StudyModule>;
    const documentIsValid = candidate.sourceDocument === undefined || isSourceDocumentMeta(candidate.sourceDocument);
    return Boolean(
      typeof candidate.id === "string" &&
      typeof candidate.slug === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.subject === "string" &&
      typeof candidate.description === "string" &&
      typeof candidate.progress === "number" &&
      typeof candidate.topics === "number" &&
      typeof candidate.status === "string" &&
      documentIsValid &&
      typeof candidate.createdAt === "string" &&
      typeof candidate.updatedAt === "string"
    );
  });
  if (safe.length !== value.length) return null;

  return safe.map((studyModule) => ({
    ...studyModule,
    sourceDocument: studyModule.sourceDocument ? { ...studyModule.sourceDocument, storage: studyModule.sourceDocument.storage ?? "local" } : undefined,
  }));
}

function loadLocalModules() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedModules));
      return seedModules;
    }
    return normalizeStoredModules(JSON.parse(stored)) ?? seedModules;
  } catch {
    return seedModules;
  }
}

function persistLocalModules(modules: StudyModule[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(modules)); } catch { /* mantener memoria */ }
}

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<StudyModule[]>(seedModules);
  const [localSnapshot, setLocalSnapshot] = useState<StudyModule[]>(seedModules);
  const [hydrated, setHydrated] = useState(false);
  const [persistence, setPersistence] = useState<"local" | "cloud">("local");
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [cloudError, setCloudError] = useState("");
  const [migrationBusy, setMigrationBusy] = useState(false);

  async function refreshCloud() {
    const result = await getCloudModules();
    setModules(result.modules);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const local = loadLocalModules();
      if (cancelled) return;
      setLocalSnapshot(local);
      setModules(local);

      try {
        const status = await getCloudStatus();
        if (cancelled) return;
        setCloudStatus(status);

        if (status.configured && status.databaseReady && status.storageReady) {
          const result = await getCloudModules();
          if (cancelled) return;
          setPersistence("cloud");
          setModules(result.modules);
          setCloudError("");
        } else if (status.configured && !status.databaseReady) {
          setCloudError(status.detail || status.message);
        }
      } catch (error) {
        if (!cancelled) setCloudError(error instanceof Error ? error.message : "No se pudo comprobar Supabase.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated || persistence !== "local") return;
    persistLocalModules(modules);
    setLocalSnapshot(modules);
  }, [hydrated, modules, persistence]);

  const migrationCandidates = useMemo(() => {
    if (persistence !== "cloud") return [];
    const cloudById = new Map(modules.map((studyModule) => [studyModule.id, studyModule]));
    return localSnapshot.filter((localModule) => {
      const cloudModule = cloudById.get(localModule.id);
      if (!cloudModule) return true;
      const localIsNewer = new Date(localModule.updatedAt).getTime() > new Date(cloudModule.updatedAt).getTime();
      const documentNeedsMigration = Boolean(localModule.sourceDocument && !cloudModule.sourceDocument);
      return localIsNewer || documentNeedsMigration;
    });
  }, [localSnapshot, modules, persistence]);

  const value = useMemo<ModuleContextValue>(() => ({
    modules,
    hydrated,
    persistence,
    cloudStatus,
    cloudError,
    migrationCandidates,
    migrationBusy,
    async createModule(input) {
      if (persistence === "cloud") {
        const studyModule = await createCloudModule(input);
        setModules((current) => [studyModule, ...current.filter((item) => item.id !== studyModule.id)]);
        return studyModule;
      }

      const now = new Date().toISOString();
      const baseSlug = slugifyModuleTitle(input.title);
      let slug = baseSlug;
      let suffix = 2;
      while (modules.some((studyModule) => studyModule.slug === slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      const studyModule: StudyModule = {
        id: makeId(),
        slug,
        title: input.title.trim(),
        subject: input.subject.trim(),
        description: input.description?.trim() || "Módulo académico preparado para recibir contenido, práctica y seguimiento de dominio.",
        progress: 0,
        topics: 0,
        status: "Nuevo",
        createdAt: now,
        updatedAt: now,
      };
      setModules((current) => [studyModule, ...current]);
      return studyModule;
    },
    async updateModule(id, input) {
      if (persistence === "cloud") {
        const updated = await updateCloudModule(id, input);
        setModules((current) => current.map((studyModule) => studyModule.id === id ? updated : studyModule));
        return;
      }

      setModules((current) => current.map((studyModule) => {
        if (studyModule.id !== id) return studyModule;
        const progress = typeof input.progress === "number" ? Math.min(100, Math.max(0, input.progress)) : studyModule.progress;
        let status: ModuleStatus = input.status ?? studyModule.status;
        if (input.status === undefined && studyModule.status !== "Archivado") {
          if (progress === 100) status = "Completado";
          else if (progress > 0) status = "En curso";
          else status = "Nuevo";
        }
        return {
          ...studyModule,
          ...input,
          progress,
          status,
          title: input.title?.trim() || studyModule.title,
          subject: input.subject?.trim() || studyModule.subject,
          description: input.description?.trim() ?? studyModule.description,
          updatedAt: new Date().toISOString(),
        };
      }));
    },
    async archiveModule(id) {
      if (persistence === "cloud") {
        const updated = await updateCloudModule(id, { status: "Archivado" });
        setModules((current) => current.map((studyModule) => studyModule.id === id ? updated : studyModule));
        return;
      }
      setModules((current) => current.map((studyModule) => studyModule.id === id ? { ...studyModule, status: "Archivado", updatedAt: new Date().toISOString() } : studyModule));
    },
    async restoreModule(id) {
      const studyModule = modules.find((item) => item.id === id);
      if (!studyModule) return;
      const status: ModuleStatus = studyModule.progress === 100 ? "Completado" : studyModule.progress > 0 ? "En curso" : "Nuevo";
      if (persistence === "cloud") {
        const updated = await updateCloudModule(id, { status });
        setModules((current) => current.map((item) => item.id === id ? updated : item));
        return;
      }
      setModules((current) => current.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    },
    async removeModule(id) {
      if (persistence === "cloud") {
        await removeCloudModule(id);
        setModules((current) => current.filter((studyModule) => studyModule.id !== id));
        setLocalSnapshot((current) => {
          const next = current.filter((studyModule) => studyModule.id !== id);
          persistLocalModules(next);
          return next;
        });
      } else {
        try { await deleteSourceDocument(id); } catch { /* continuar */ }
        setModules((current) => current.filter((studyModule) => studyModule.id !== id));
      }
      try {
        window.localStorage.removeItem(`maestria-lab.reader.${id}`);
        window.localStorage.removeItem(`maestria-lab.reader-size.${id}`);
      } catch { /* limpieza opcional */ }
    },
    async attachSourceDocument(id, file) {
      if (persistence === "cloud") {
        if (!cloudStatus) throw new Error("No se pudo resolver la conexión con Supabase.");
        const result = await attachCloudDocument(cloudStatus, id, file);
        setModules((current) => current.map((studyModule) => studyModule.id === id ? {
          ...studyModule,
          sourceDocument: result.document,
          updatedAt: new Date().toISOString(),
        } : studyModule));
        return result.document;
      }

      const meta: SourceDocumentMeta = {
        name: file.name,
        kind: documentKindFromName(file.name),
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
        addedAt: new Date().toISOString(),
        storage: "local",
      };
      await saveSourceDocument(id, file);
      setModules((current) => current.map((studyModule) => studyModule.id === id ? { ...studyModule, sourceDocument: meta, updatedAt: new Date().toISOString() } : studyModule));
      return meta;
    },
    async detachSourceDocument(id) {
      if (persistence === "cloud") {
        await detachCloudDocument(id);
      } else {
        await deleteSourceDocument(id);
      }
      setModules((current) => current.map((studyModule) => studyModule.id === id ? { ...studyModule, sourceDocument: undefined, updatedAt: new Date().toISOString() } : studyModule));
    },
    async retrySourceExtraction(id) {
      if (persistence !== "cloud") return undefined;
      const result = await retryCloudExtraction(id);
      if (result.document) {
        setModules((current) => current.map((studyModule) => studyModule.id === id ? { ...studyModule, sourceDocument: result.document } : studyModule));
      }
      return result.document;
    },
    async getSourceDocumentUrl(id, download = false) {
      if (persistence === "cloud") return getCloudDocumentUrl(id, download);
      const file = await readSourceDocument(id);
      if (!file) return null;
      return URL.createObjectURL(file);
    },
    async migrateLocalData() {
      if (persistence !== "cloud" || !cloudStatus) return { migrated: 0, documents: 0, failed: 0, errors: [] };
      setMigrationBusy(true);
      let migrated = 0;
      let documents = 0;
      let failed = 0;
      const errors: string[] = [];

      try {
        for (const localModule of migrationCandidates) {
          try {
            const remoteModule = await importCloudModule({ ...localModule, sourceDocument: undefined });
            migrated += 1;
            const cloudBefore = modules.find((item) => item.id === localModule.id);
            if (localModule.sourceDocument && !cloudBefore?.sourceDocument && !remoteModule.sourceDocument) {
              const localFile = await readSourceDocument(localModule.id);
              if (localFile) {
                await attachCloudDocument(cloudStatus, localModule.id, localFile);
                documents += 1;
              }
            }
          } catch (error) {
            failed += 1;
            errors.push(`${localModule.title}: ${error instanceof Error ? error.message : "error desconocido"}`);
          }
        }
        await refreshCloud();
        return { migrated, documents, failed, errors };
      } finally {
        setMigrationBusy(false);
      }
    },
    async refreshModules() {
      if (persistence === "cloud") await refreshCloud();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [modules, hydrated, persistence, cloudStatus, cloudError, migrationCandidates, migrationBusy, localSnapshot]);

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export function useModules() {
  const value = useContext(ModuleContext);
  if (!value) throw new Error("useModules debe usarse dentro de ModuleProvider");
  return value;
}
