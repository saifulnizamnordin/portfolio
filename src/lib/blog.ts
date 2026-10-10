import { getCollection, type CollectionEntry } from "astro:content"

export type Post = CollectionEntry<"blog">

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => import.meta.env.DEV || !data.draft)
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function readingTime(body = "") {
  const words = body.trim().split(/\s+/).length
  return `${Math.max(1, Math.round(words / 220))} min read`
}
