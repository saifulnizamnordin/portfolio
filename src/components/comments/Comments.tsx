import { useCallback, useEffect, useMemo, useState } from "react"
import type { AuthProviderInfo } from "pocketbase"
import { LoaderCircle, LogOut, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPocketBase, POCKETBASE_URL, type CommentRecord, type CommentUser } from "@/lib/pocketbase"
import { Avatar, CommentItem, type ThreadActions } from "./CommentItem"
import { Composer } from "./Composer"
import { Lightbox } from "./Lightbox"
import { byCreated } from "./utils"

type Sort = "oldest" | "newest"

function currentUser() {
  const { authStore } = getPocketBase()
  return authStore.isValid && authStore.record?.collectionName === "users" ? (authStore.record as CommentUser) : null
}

export default function Comments({ slug }: { slug: string }) {
  const pb = getPocketBase()
  const [user, setUser] = useState<CommentUser | null>(null)
  const [providers, setProviders] = useState<AuthProviderInfo[] | null>(null)
  const [comments, setComments] = useState<CommentRecord[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [sort, setSort] = useState<Sort>("oldest")
  const [signingIn, setSigningIn] = useState("")
  const [authError, setAuthError] = useState("")
  const [viewer, setViewer] = useState<{ record: CommentRecord; index: number } | null>(null)
  const filter = useMemo(() => pb.filter("post = {:slug}", { slug }), [pb, slug])

  const upsert = useCallback((record: CommentRecord) => {
    setComments((prev) => [...prev.filter((c) => c.id !== record.id), record])
  }, [])

  const drop = useCallback((id: string) => {
    // Replies are cascade-deleted server-side; prune them locally too.
    setComments((prev) => {
      const gone = new Set([id])
      let grew = true
      while (grew) {
        grew = false
        for (const c of prev) if (c.parent && gone.has(c.parent) && !gone.has(c.id)) gone.add(c.id), (grew = true)
      }
      return prev.filter((c) => !gone.has(c.id))
    })
  }, [])

  // Session: restore, validate, follow changes (also across tabs via the SDK's storage listener).
  useEffect(() => {
    setUser(currentUser())
    const off = pb.authStore.onChange(() => setUser(currentUser()))
    if (currentUser()) pb.collection("users").authRefresh({ requestKey: null }).catch(() => pb.authStore.clear())
    pb.collection("users")
      .listAuthMethods({ requestKey: null })
      .then((m) => setProviders(m.oauth2.enabled ? m.oauth2.providers : []))
      .catch(() => setProviders([]))
    return off
  }, [pb])

  const load = useCallback(async () => {
    setStatus("loading")
    try {
      const list = await pb.collection("comments").getFullList<CommentRecord>({
        filter,
        expand: "author",
        sort: "created",
        requestKey: null,
      })
      setComments(list)
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [pb, filter])

  useEffect(() => {
    load()
    let cancelled = false
    let unsubscribe: (() => Promise<void>) | undefined
    pb.collection("comments")
      .subscribe<CommentRecord>(
        "*",
        (e) => (e.action === "delete" ? drop(e.record.id) : upsert(e.record)),
        { filter, expand: "author" },
      )
      .then((off) => {
        if (cancelled) off()
        else unsubscribe = off
      })
      .catch(() => {}) // realtime is a nicety; the list still works without it
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [pb, filter, load, upsert, drop])

  // Jump to a linked comment (#comment-<id>) once the list has rendered.
  useEffect(() => {
    if (status !== "ready" || !location.hash.startsWith("#comment-")) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" })
  }, [status])

  async function signIn(provider: string) {
    setSigningIn(provider)
    setAuthError("")
    try {
      // Called straight from the click handler so Safari allows the OAuth popup.
      const { record, meta } = await pb.collection("users").authWithOAuth2({ provider })
      const name = (meta?.name || meta?.username || "").trim()
      if (!record.name && name) await pb.collection("users").update(record.id, { name })
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (!/cancel|closed/i.test(message)) setAuthError("Sign-in failed. Please try again.")
    } finally {
      setSigningIn("")
    }
  }

  const tree = useMemo(() => {
    const children = new Map<string, CommentRecord[]>()
    for (const c of [...comments].sort(byCreated)) {
      const key = c.parent || ""
      children.set(key, [...(children.get(key) ?? []), c])
    }
    const roots = children.get("") ?? []
    return { children, roots: sort === "newest" ? [...roots].reverse() : roots }
  }, [comments, sort])

  const actions: ThreadActions = {
    user,
    repliesTo: (id) => tree.children.get(id) ?? [],
    find: (id) => comments.find((c) => c.id === id),
    async create(body, images, parent) {
      if (!user) throw new Error("Please sign in first.")
      const record = await pb
        .collection("comments")
        .create<CommentRecord>({ post: slug, author: user.id, body, parent: parent ?? "", images }, { expand: "author" })
      upsert(record)
    },
    async update(id, body) {
      upsert(await pb.collection("comments").update<CommentRecord>(id, { body }, { expand: "author" }))
    },
    async remove(id) {
      await pb.collection("comments").delete(id)
      drop(id)
    },
    openImage: (record, index) => setViewer({ record, index }),
  }

  const count = comments.length

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-16 border-t pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="comments-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <MessageSquare className="size-5" />
          {status === "ready" ? `${count} ${count === 1 ? "comment" : "comments"}` : "Comments"}
        </h2>
        {count > 1 && (
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {(["oldest", "newest"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-md px-2.5 py-1 capitalize ${sort === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {user ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Avatar user={user} name={user.name || "You"} className="size-7" />
              <span>
                Commenting as <span className="font-medium">{user.name || "you"}</span>
              </span>
            </span>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => pb.authStore.clear()}>
              <LogOut /> Sign out
            </Button>
          </div>
          <Composer onSubmit={(body, images) => actions.create(body, images)} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          {providers === null ? (
            <p className="text-muted-foreground">Loading sign-in options…</p>
          ) : providers.length === 0 ? (
            <p className="text-muted-foreground">Commenting isn't open yet.</p>
          ) : (
            <>
              <p className="mb-3 text-muted-foreground">Sign in to join the discussion. Your email is never shown.</p>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <Button key={p.name} variant="outline" onClick={() => signIn(p.name)} disabled={!!signingIn}>
                    {signingIn === p.name ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <img
                        src={`${POCKETBASE_URL}/_/images/oauth2/${p.name}.svg`}
                        alt=""
                        className="size-4 dark:invert-[.85]"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    {p.displayName}
                  </Button>
                ))}
              </div>
              {authError && <p className="mt-2 text-xs text-destructive">{authError}</p>}
            </>
          )}
        </div>
      )}

      <div className="mt-8">
        {status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading comments…
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-muted-foreground">
            Couldn't load comments.{" "}
            <button type="button" onClick={load} className="underline underline-offset-4">
              Try again
            </button>
          </p>
        )}
        {status === "ready" && count === 0 && <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
        {status === "ready" && count > 0 && (
          <ol className="space-y-6">
            {tree.roots.map((c) => (
              <CommentItem key={c.id} comment={c} depth={0} actions={actions} />
            ))}
          </ol>
        )}
      </div>

      {viewer && (
        <Lightbox
          record={viewer.record}
          index={viewer.index}
          onIndexChange={(index) => setViewer({ ...viewer, index })}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  )
}
