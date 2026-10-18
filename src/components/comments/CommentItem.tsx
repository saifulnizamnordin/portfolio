import { useState, type ComponentProps, type ReactNode } from "react"
import { Pencil, Reply, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fileUrl, THUMB_AVATAR, THUMB_GRID, THUMB_SINGLE, type CommentRecord, type CommentUser } from "@/lib/pocketbase"
import { cn } from "@/lib/utils"
import { Composer } from "./Composer"
import { Markdown } from "./Markdown"
import { displayName, initials, parseDate, timeAgo, wasEdited } from "./utils"

// Deeper replies stop indenting and show who they answer instead, so threads stay readable on phones.
const MAX_DEPTH = 3

export interface ThreadActions {
  user: CommentUser | null
  repliesTo: (id: string) => CommentRecord[]
  find: (id: string) => CommentRecord | undefined
  create: (body: string, images: File[], parent?: string) => Promise<void>
  update: (id: string, body: string) => Promise<void>
  remove: (id: string) => Promise<void>
  openImage: (record: CommentRecord, index: number) => void
}

const RETRIES = 2

// A file requested right after upload (e.g. an OAuth avatar fetched during sign-in) can 404, and the
// CDN in front of PocketBase caches that 404. Retry with a cache-busting URL before giving up.
function RetryImage({ src, fallback = null, ...props }: ComponentProps<"img"> & { src: string; fallback?: ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  if (attempt > RETRIES) return fallback
  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src
  return <img {...props} src={url} onError={() => setTimeout(() => setAttempt((a) => a + 1), 1000 * (attempt + 1))} />
}

export function Avatar({ user, name, className }: { user?: CommentUser; name: string; className?: string }) {
  const initialsBadge = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      {initials(name) || "?"}
    </span>
  )
  if (user?.avatar) {
    const src = fileUrl(user, user.avatar, THUMB_AVATAR)
    return (
      <RetryImage
        key={src}
        src={src}
        fallback={initialsBadge}
        alt=""
        loading="lazy"
        className={cn("size-9 shrink-0 rounded-full bg-muted object-cover", className)}
      />
    )
  }
  return initialsBadge
}

function Images({ comment, onOpen }: { comment: CommentRecord; onOpen: (index: number) => void }) {
  const single = comment.images.length === 1
  return (
    <div className={cn("mt-2 flex flex-wrap gap-2")}>
      {comment.images.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={`View image ${i + 1} at full size`}
          className="overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <RetryImage
            src={fileUrl(comment, name, single ? THUMB_SINGLE : THUMB_GRID)}
            fallback={<span className="flex size-28 items-center justify-center text-xs text-muted-foreground sm:size-32">Image unavailable</span>}
            alt={`Attachment ${i + 1}`}
            loading="lazy"
            className={single ? "block max-h-80 w-auto max-w-full" : "block size-28 object-cover sm:size-32"}
          />
        </button>
      ))}
    </div>
  )
}

export function CommentItem({ comment, depth, actions }: { comment: CommentRecord; depth: number; actions: ThreadActions }) {
  const [mode, setMode] = useState<"view" | "reply" | "edit">("view")
  const [deleting, setDeleting] = useState(false)
  const name = displayName(comment)
  const isOwner = actions.user?.id === comment.author
  const replies = actions.repliesTo(comment.id)
  const parent = depth >= MAX_DEPTH && comment.parent ? actions.find(comment.parent) : undefined

  async function remove() {
    const note = replies.length ? " Its replies will be removed too." : ""
    if (!confirm(`Delete this comment?${note}`)) return
    setDeleting(true)
    try {
      await actions.remove(comment.id)
    } catch {
      setDeleting(false)
      alert("Couldn't delete the comment. Please try again.")
    }
  }

  return (
    <li id={`comment-${comment.id}`} className={cn("scroll-mt-24", deleting && "opacity-50")}>
      <div className="flex gap-3">
        <Avatar user={comment.expand?.author} name={name} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className="font-medium">{name}</span>
            {parent && <span className="text-muted-foreground">↳ {displayName(parent)}</span>}
            <a
              href={`#comment-${comment.id}`}
              className="text-xs text-muted-foreground hover:underline"
              title={parseDate(comment.created).toLocaleString()}
            >
              {timeAgo(comment.created)}
            </a>
            {wasEdited(comment) && <span className="text-xs text-muted-foreground">· edited</span>}
          </p>

          {mode === "edit" ? (
            <div className="mt-2">
              <Composer
                initialBody={comment.body}
                allowImages={false}
                submitLabel="Save"
                autoFocus
                onCancel={() => setMode("view")}
                onSubmit={async (body) => {
                  if (!body && comment.images.length === 0) throw new Error("A comment can't be empty.")
                  await actions.update(comment.id, body)
                  setMode("view")
                }}
              />
            </div>
          ) : (
            comment.body && <Markdown text={comment.body} className="mt-1" />
          )}

          {comment.images.length > 0 && <Images comment={comment} onOpen={(i) => actions.openImage(comment, i)} />}

          <div className="mt-1 -ml-2 flex gap-0.5">
            {actions.user && (
              <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setMode(mode === "reply" ? "view" : "reply")}>
                <Reply /> Reply
              </Button>
            )}
            {isOwner && mode !== "edit" && (
              <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setMode("edit")}>
                <Pencil /> Edit
              </Button>
            )}
            {isOwner && (
              <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={remove} disabled={deleting}>
                <Trash2 /> Delete
              </Button>
            )}
          </div>

          {mode === "reply" && (
            <div className="mt-2">
              <Composer
                placeholder={`Reply to ${name}…`}
                submitLabel="Reply"
                autoFocus
                onCancel={() => setMode("view")}
                onSubmit={async (body, images) => {
                  await actions.create(body, images, comment.id)
                  setMode("view")
                }}
              />
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <ol className={cn("mt-4 space-y-5", depth < MAX_DEPTH && "ml-4 border-l pl-4 sm:ml-[1.125rem] sm:pl-5")}>
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} actions={actions} />
          ))}
        </ol>
      )}
    </li>
  )
}
