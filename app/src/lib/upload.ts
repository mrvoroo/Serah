"use client";
import { api } from "@/lib/api";

// رفع على دفعات (8 ميجا) إلى جلسة رفع متصلة على درايف — يكمل حتى لو النت ضعيف
export async function putChunks(url: string, file: File, onProgress: (p: number) => void): Promise<string> {
  const CH = 8 * 1024 * 1024; let start = 0, tries = 0;
  while (start < file.size) {
    const end = Math.min(start + CH, file.size);
    try {
      const r = await fetch(url, { method: "PUT", headers: { "Content-Range": `bytes ${start}-${end - 1}/${file.size}` }, body: file.slice(start, end) });
      if (r.status === 308) { const rg = r.headers.get("Range"); start = rg ? Number(rg.split("-")[1]) + 1 : end; }
      else if (r.ok) return (await r.json()).id;
      else throw new Error("status " + r.status);
      tries = 0; onProgress(Math.round((start / file.size) * 100));
    } catch (e) { if (++tries > 6) throw e; await new Promise((res) => setTimeout(res, 2000 * tries)); }
  }
  throw new Error("لم يكتمل الرفع");
}

// رفع ملف صوت أو صورة لدرايف ويرجع معرّفه
export async function uploadFile(file: File, kind: "audio" | "image", onProgress: (p: number) => void) {
  const { uploadUrl } = await api<{ uploadUrl: string }>("startUpload", { name: file.name, mime: file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg"), kind, origin: window.location.origin });
  return putChunks(uploadUrl, file, onProgress);
}
