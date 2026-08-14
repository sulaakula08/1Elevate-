"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * Figures belonging to questions: diagrams, graphs, tables, geometry.
 *
 * A public bucket, unlike feedback screenshots. Those are private because they
 * are one student's report; a figure is part of a question every signed-in
 * student has to load, and a signed URL per figure would mean a round trip per
 * image on every question — and an expiry that can strand a figure mid-test.
 *
 * PNG, not JPEG. The screenshot path re-encodes to JPEG because a photograph
 * survives it; line art does not. JPEG ringing turns a thin axis grey and puts
 * halos around gridlines, which is exactly the detail a student has to read off
 * a scatterplot.
 */

export const FIGURES_BUCKET = "question-figures";

/** Wide enough for a full-page figure, small enough to load on a phone. */
const MAX_EDGE = 1400;
/** Anything larger is a photograph of a page rather than a figure. */
const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Down to MAX_EDGE, as PNG. An SVG is passed through untouched: it is already
 * resolution-independent, and rasterising it would be a straight downgrade.
 */
async function prepare(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  // Diagrams are mostly flat colour with thin strokes; high-quality smoothing is
  // what keeps a 1px axis from disappearing when the image is scaled down.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ?? file;
}

export type UploadedFigure = { src: string };

/**
 * Uploads one figure and returns the URL a question stores.
 *
 * Throws with a message meant for the author: an admin pasting figures needs to
 * know whether the file was too big or the bucket is missing, and "failed" tells
 * them neither.
 */
export async function uploadFigure(file: File): Promise<UploadedFigure> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is over 6 MB — crop or shrink it first.");

  const client = supabase();
  if (!client) throw new Error("Supabase is not configured.");

  const { data } = await client.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sign in again — the session expired.");

  const blob = await prepare(file);
  const extension = file.type === "image/svg+xml" ? "svg" : "png";
  // Foldered by uploader, which is the shape the storage policy is written
  // against — the same convention the feedback bucket uses.
  const path = `${id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await client.storage
    .from(FIGURES_BUCKET)
    .upload(path, blob, { contentType: blob.type || `image/${extension}` });

  if (error) {
    // The bucket not existing is the one failure an admin can fix themselves, and
    // it is the likely one on a database that has not run the latest schema.
    if (/bucket/i.test(error.message)) {
      throw new Error(`Storage bucket "${FIGURES_BUCKET}" is missing — run supabase/schema.sql.`);
    }
    throw new Error(error.message);
  }

  const { data: url } = client.storage.from(FIGURES_BUCKET).getPublicUrl(path);
  return { src: url.publicUrl };
}
