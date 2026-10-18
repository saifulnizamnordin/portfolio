import PocketBase, { type RecordModel } from "pocketbase"

export const POCKETBASE_URL = import.meta.env.PUBLIC_POCKETBASE_URL ?? "https://pb.llyf.in"

let client: PocketBase | undefined

// Browser-only singleton: the auth session lives in localStorage via the SDK's default store.
export function getPocketBase() {
  client ??= new PocketBase(POCKETBASE_URL)
  return client
}

export interface CommentUser extends RecordModel {
  name: string
  avatar: string
}

export interface CommentRecord extends RecordModel {
  post: string
  author: string
  parent: string
  body: string
  images: string[]
  created: string
  updated: string
  expand?: { author?: CommentUser }
}

// Thumb sizes must match the ones configured on the PocketBase file fields,
// otherwise the server silently serves the original.
export const THUMB_SINGLE = "480x0"
export const THUMB_GRID = "160x160"
export const THUMB_AVATAR = "80x80"

export const MAX_IMAGES = 4
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
export const MAX_BODY = 5000

export function fileUrl(record: RecordModel, filename: string, thumb?: string) {
  return getPocketBase().files.getURL(record, filename, thumb ? { thumb } : undefined)
}
