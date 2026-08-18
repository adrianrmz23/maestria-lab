import type { ModuleResourceType } from "@/lib/resources/types";

export function inferExternalResourceType(url: string): ModuleResourceType | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const extension = pathname.split(".").pop() || "";
    if (["mp3", "m4a", "wav", "ogg", "aac"].includes(extension)) return "audio";
    if (["mp4", "webm", "mov", "m4v"].includes(extension)) return "video";
    if (extension === "pdf") return "pdf";
    if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension)) return "image";
    if (["ppt", "pptx"].includes(extension)) return "presentation";
    if (["doc", "docx", "txt", "md"].includes(extension)) return "document";
    return "link";
  } catch {
    return null;
  }
}

export function externalResourceUsesHttp(url: string) {
  try { return new URL(url).protocol === "http:"; } catch { return false; }
}

export function isDirectEmbeddableType(type: ModuleResourceType) {
  return ["audio", "video", "image", "map", "pdf"].includes(type);
}
