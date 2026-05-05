import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  getExtension,
  validateUploadFile,
} from "./validation";

describe("getExtension", () => {
  it("liefert die Endung in Kleinbuchstaben", () => {
    expect(getExtension("Vertrag.PDF")).toBe("pdf");
    expect(getExtension("Foto.JPG")).toBe("jpg");
  });
  it("ohne Punkt → leerer String", () => {
    expect(getExtension("README")).toBe("");
  });
  it("Punkt am Ende → leerer String", () => {
    expect(getExtension("data.")).toBe("");
  });
  it("mehrere Punkte: nur die letzte Endung", () => {
    expect(getExtension("archive.tar.gz")).toBe("gz");
  });
});

describe("validateUploadFile — happy path", () => {
  it("akzeptiert PDF mit korrektem Mime-Type", () => {
    const r = validateUploadFile({
      name: "Vertrag.pdf",
      size: 50_000,
      type: "application/pdf",
    });
    expect(r.ok).toBe(true);
  });
  it("akzeptiert DOCX (browsergenerierter Mime-Type)", () => {
    const r = validateUploadFile({
      name: "Aufmass.docx",
      size: 100_000,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(r.ok).toBe(true);
  });
  it("akzeptiert per Endung, wenn Mime-Type leer ist", () => {
    const r = validateUploadFile({
      name: "Foto.jpg",
      size: 200_000,
      type: "",
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateUploadFile — Ablehnungen", () => {
  it("lehnt leere Dateien ab", () => {
    const r = validateUploadFile({ name: "leer.pdf", size: 0, type: "application/pdf" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/leer/i);
  });

  it("lehnt zu große Dateien ab", () => {
    const r = validateUploadFile({
      name: "riesig.pdf",
      size: MAX_UPLOAD_BYTES + 1,
      type: "application/pdf",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/zu groß/);
  });

  it("lehnt fehlenden Dateinamen ab", () => {
    const r = validateUploadFile({
      name: "",
      size: 1000,
      type: "application/pdf",
    });
    expect(r.ok).toBe(false);
  });

  it("lehnt Pfad-Traversal-Versuche ab", () => {
    const cases = ["../etc/passwd", "..\\windows", "subdir/file.pdf", "evil\\file.pdf"];
    for (const name of cases) {
      const r = validateUploadFile({ name, size: 1000, type: "application/pdf" });
      expect(r.ok).toBe(false);
    }
  });

  it("lehnt unbekannte Dateitypen ab", () => {
    const cases: { name: string; type: string }[] = [
      { name: "schadcode.exe", type: "application/x-msdownload" },
      { name: "script.js", type: "text/javascript" },
      { name: "shell.sh", type: "application/x-sh" },
      { name: "test.zip", type: "application/zip" },
    ];
    for (const c of cases) {
      const r = validateUploadFile({ ...c, size: 1000 });
      expect(r.ok).toBe(false);
    }
  });
});

describe("formatBytes", () => {
  it("Bytes unter 1 KB", () => {
    expect(formatBytes(500)).toBe("500 B");
  });
  it("KB-Bereich", () => {
    expect(formatBytes(1500)).toMatch(/KB/);
  });
  it("MB-Bereich", () => {
    expect(formatBytes(2_500_000)).toMatch(/MB/);
  });
});

describe("ALLOWED_*  Konstanten — Sanity", () => {
  it("erlaubt PDF und Standard-Office-Formate", () => {
    expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has("pdf")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has("docx")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has("xlsx")).toBe(true);
  });
  it("erlaubt keine ausführbaren Formate", () => {
    expect(ALLOWED_EXTENSIONS.has("exe")).toBe(false);
    expect(ALLOWED_EXTENSIONS.has("bat")).toBe(false);
    expect(ALLOWED_EXTENSIONS.has("sh")).toBe(false);
    expect(ALLOWED_EXTENSIONS.has("js")).toBe(false);
  });
});
