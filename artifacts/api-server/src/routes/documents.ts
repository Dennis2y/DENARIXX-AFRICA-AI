import { Router, type IRouter } from "express";
import { db, documentUploads, documentChunks, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { generateAI } from "../lib/ai/aiRouter";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

const router: IRouter = Router();

const MAX_TEXT_CHARS = 80_000;

async function getDbUser(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  return user;
}


async function extractPdfText(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const pdf = await (pdfjs as any).getDocument({ data: uint8 }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .filter(Boolean)
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractUploadedContent(filename: string, fileType: string, content: string, encoding?: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (encoding === "base64" || ["pdf", "docx", "doc"].includes(ext)) {
    const buffer = Buffer.from(content, "base64");

    if (ext === "pdf" || fileType.includes("pdf")) {
      return extractPdfText(buffer);
    }

    if (ext === "docx" || fileType.includes("wordprocessingml")) {
      return extractDocxText(buffer);
    }

    if (ext === "doc") {
      throw new Error("Legacy .doc files are not supported yet. Please convert to .docx or PDF.");
    }
  }

  return content;
}



function chunkDocumentText(text: string, chunkSize = 1800, overlap = 250): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 80) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks.slice(0, 80);
}


function cleanContent(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

// POST /api/documents/upload
router.post("/upload", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const body = req.body as {
    filename?: string;
    fileType?: string;
    content?: string;
    encoding?: "text" | "base64";
  };

  const filename = body.filename?.trim();
  const fileType = body.fileType?.trim().toLowerCase() || "text/plain";
  let content = "";
  try {
    content = cleanContent(await extractUploadedContent(filename ?? "", fileType, body.content ?? "", body.encoding));
  } catch (err: any) {
    res.status(415).json({ error: err.message ?? "Could not read this document" });
    return;
  }

  if (!filename || !content) {
    res.status(400).json({ error: "filename and content are required" });
    return;
  }

  if (content.length < 5) {
    res.status(400).json({ error: "Document content is too short" });
    return;
  }

  try {
    const user = await getDbUser(clerkUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let summary: string | null = null;

    try {
      const ai = await generateAI({
        messages: [
          {
            role: "system",
            content:
              "You summarize uploaded documents for a career AI assistant. Return a concise 4-6 bullet summary. Keep the same language as the document when obvious.",
          },
          {
            role: "user",
            content: `Filename: ${filename}\n\nDocument:\n${content.slice(0, 12_000)}`,
          },
        ],
        temperature: 0.2,
      });

      summary = ai.content?.trim() || null;
    } catch {
      summary = null;
    }

    const [document] = await db
      .insert(documentUploads)
      .values({
        userId: user.id,
        filename,
        fileType,
        content,
        summary,
      })
      .returning();

    const chunks = chunkDocumentText(content);
    if (chunks.length > 0) {
      await db.insert(documentChunks).values(
        chunks.map((chunk, index) => ({
          documentId: document.id,
          chunkIndex: index,
          content: chunk,
        })),
      );
    }

    res.json({ document: { ...document, chunkCount: chunks.length } });
  } catch (err) {
    req.log.error({ err }, "Failed to upload document");
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// GET /api/documents
router.get("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;

  try {
    const user = await getDbUser(clerkUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const documents = await db
      .select({
        id: documentUploads.id,
        filename: documentUploads.filename,
        fileType: documentUploads.fileType,
        summary: documentUploads.summary,
        createdAt: documentUploads.createdAt,
        updatedAt: documentUploads.updatedAt,
      })
      .from(documentUploads)
      .where(and(eq(documentUploads.userId, user.id), eq(documentUploads.isActive, true)))
      .orderBy(desc(documentUploads.updatedAt))
      .limit(20);

    res.json({ documents });
  } catch (err) {
    req.log.error({ err }, "Failed to load documents");
    res.status(500).json({ error: "Failed to load documents" });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }

  try {
    const user = await getDbUser(clerkUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [document] = await db
      .update(documentUploads)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(documentUploads.id, id), eq(documentUploads.userId, user.id)))
      .returning();

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
