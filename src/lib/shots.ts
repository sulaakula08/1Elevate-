"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * Screenshots attached to feedback.
 *
 * They go from the browser straight into a private storage bucket, under a
 * folder named for the uploader — that path shape is what the storage policies
 * are written against. The API route only ever sees the paths.
 */

export const SHOTS_BUCKET = "feedback-shots";
export const MAX_SHOTS = 3;

/** Wide enough to read a full-screen capture; small enough to send on a phone. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

/**
 * A screenshot as JPEG, no larger than MAX_EDGE on its longest side.
 *
 * Phone captures arrive at 3–8 MB, which is a slow upload on the connection a
 * student is complaining about. Nothing in a bug report needs that resolution:
 * what matters is that the text on screen stays legible, and 1600px keeps it.
 */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  return blob ?? file;
}

export type Shot = {
  /** Storage path, which is what the message stores. */
  path: string;
  /** Local object URL, for the thumbnail while the form is still open. */
  preview: string;
};

/** Uploads one screenshot and returns where it landed. */
export async function uploadShot(file: File): Promise<Shot> {
  const client = supabase();
  if (!client) throw new Error("not configured");

  const { data } = await client.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("not signed in");

  const blob = await downscale(file);
  const path = `${id}/${crypto.randomUUID()}.jpg`;
  const { error } = await client.storage
    .from(SHOTS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;

  return { path, preview: URL.createObjectURL(blob) };
}

/** Removes an upload the student changed their mind about before sending. */
export async function removeShot(path: string): Promise<void> {
  const client = supabase();
  if (!client) return;
  await client.storage.from(SHOTS_BUCKET).remove([path]);
}
