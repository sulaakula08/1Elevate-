"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * Profile pictures.
 *
 * Deliberately not `uploadFigure` with a different bucket name. A figure is line
 * art that must survive at full width, so that path caps at 1400px and writes
 * PNG to keep a 1px axis crisp. A face is the opposite case: it is displayed at
 * 96px at the very largest and 28px in a feed, it is a photograph, and PNG at
 * 1400px would ship a megabyte to draw a thumbnail. So this crops to a square,
 * resamples to 512, and encodes JPEG.
 */

export const AVATARS_BUCKET = "avatars";

/** Twice the largest place it is drawn, which covers a 2× screen. */
const EDGE = 512;
const MAX_BYTES = 8 * 1024 * 1024;
const QUALITY = 0.85;

/**
 * Centre-cropped to a square, then resampled.
 *
 * Cropping here rather than with CSS means the file itself is square: every
 * surface that shows an avatar gets the same image, and none of them has to
 * agree on an object-fit rule for the result to be a circle with a face in it.
 */
async function square(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = Math.round((bitmap.width - edge) / 2);
  const sy = Math.round((bitmap.height - edge) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = EDGE;
  canvas.height = EDGE;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, EDGE, EDGE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  return blob ?? file;
}

/**
 * Uploads a picture and returns the URL to store on the profile.
 *
 * The filename carries a fresh uuid every time rather than a fixed "avatar.jpg".
 * Overwriting one path would be tidier on disk and wrong everywhere else: the
 * bucket is public and therefore CDN-cached, so a student replacing their photo
 * would keep seeing the old one until the cache expired, and would reasonably
 * conclude the upload had failed.
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is over 8 MB — pick a smaller one.");

  const client = supabase();
  if (!client) throw new Error("Supabase is not configured.");

  const { data } = await client.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sign in again — the session expired.");

  const blob = await square(file);
  // Foldered by owner: the storage policy authorises on this first segment, so
  // the shape of the path is the access control.
  const path = `${id}/${crypto.randomUUID()}.jpg`;

  const { error } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });

  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error(`Storage bucket "${AVATARS_BUCKET}" is missing — run supabase/schema.sql.`);
    }
    throw new Error(error.message);
  }

  const { data: url } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return url.publicUrl;
}
