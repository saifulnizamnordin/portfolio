import type { CommentRecord } from "@/lib/pocketbase"

// PocketBase dates look like "2026-10-18 09:41:07.123Z"; the space trips up some engines.
export function parseDate(value: string) {
  return new Date(value.replace(" ", "T"))
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

export function timeAgo(value: string) {
  const seconds = (parseDate(value).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

export function wasEdited(comment: CommentRecord) {
  return parseDate(comment.updated).getTime() - parseDate(comment.created).getTime() > 5000
}

export function displayName(comment: CommentRecord) {
  return comment.expand?.author?.name?.trim() || "Anonymous"
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function byCreated(a: CommentRecord, b: CommentRecord) {
  return parseDate(a.created).getTime() - parseDate(b.created).getTime()
}
