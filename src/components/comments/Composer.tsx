import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react"
import { ImagePlus, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IMAGE_TYPES, MAX_BODY, MAX_IMAGE_BYTES, MAX_IMAGES } from "@/lib/pocketbase"
import { cn } from "@/lib/utils"
import { Markdown } from "./Markdown"

interface Props {
  onSubmit: (body: string, images: File[]) => Promise<void>
  onCancel?: () => void
  initialBody?: string
  placeholder?: string
  submitLabel?: string
  allowImages?: boolean
  autoFocus?: boolean
}

interface Attachment {
  file: File
  preview: string
}

export function Composer({
  onSubmit,
  onCancel,
  initialBody = "",
  placeholder = "Join the discussion…",
  submitLabel = "Post",
  allowImages = true,
  autoFocus,
}: Props) {
  const [body, setBody] = useState(initialBody)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const fileInput = useRef<HTMLInputElement>(null)
  const latest = useRef(attachments)
  latest.current = attachments

  useEffect(() => () => latest.current.forEach((a) => URL.revokeObjectURL(a.preview)), [])

  function addFiles(files: Iterable<File>) {
    const accepted: Attachment[] = []
    const problems: string[] = []
    for (const file of files) {
      if (attachments.length + accepted.length >= MAX_IMAGES) {
        problems.push(`Up to ${MAX_IMAGES} images per comment.`)
        break
      }
      if (!IMAGE_TYPES.includes(file.type)) problems.push(`${file.name}: only JPEG, PNG, WebP or GIF.`)
      else if (file.size > MAX_IMAGE_BYTES) problems.push(`${file.name}: larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`)
      else accepted.push({ file, preview: URL.createObjectURL(file) })
    }
    setError(problems.join(" "))
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted])
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function onPaste(e: ClipboardEvent) {
    if (!allowImages) return
    const images = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"))
    if (images.length) {
      e.preventDefault()
      addFiles(images)
    }
  }

  function onDrop(e: DragEvent) {
    if (!allowImages) return
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const canSubmit = !busy && (body.trim() !== "" || attachments.length > 0)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError("")
    try {
      await onSubmit(body.trim(), attachments.map((a) => a.file))
      attachments.forEach((a) => URL.revokeObjectURL(a.preview))
      setAttachments([])
      setBody("")
      setTab("write")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      onDragOver={(e) => {
        if (!allowImages) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        dragging && "border-ring bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-1.5 pt-1.5">
        <div role="tablist" className="flex gap-0.5 text-xs">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px rounded-t-md border border-transparent px-2.5 py-1.5 capitalize",
                tab === t ? "border-border border-b-background bg-background font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <a
          href="https://www.markdownguide.org/basic-syntax/"
          target="_blank"
          rel="noopener"
          className="pr-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="**bold**, _italic_, `code`, ```code blocks```, > quotes, - lists, [links](https://…)"
        >
          Markdown supported
        </a>
      </div>

      {tab === "preview" && (
        <div className="min-h-[5.5rem] px-3 py-2">
          {body.trim() ? <Markdown text={body} /> : <p className="text-sm text-muted-foreground">Nothing to preview.</p>}
        </div>
      )}

      <textarea
        hidden={tab === "preview"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
          if (e.key === "Escape" && onCancel) onCancel()
        }}
        placeholder={placeholder}
        maxLength={MAX_BODY}
        rows={3}
        autoFocus={autoFocus}
        className="block w-full resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {attachments.map((a, i) => (
            <div key={a.preview} className="relative">
              <img src={a.preview} alt={a.file.name} className="size-20 rounded-md border object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                aria-label={`Remove ${a.file.name}`}
                className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
        <div className="flex items-center gap-1">
          {allowImages && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={attachments.length >= MAX_IMAGES}
                className="text-muted-foreground"
              >
                <ImagePlus /> Image
              </Button>
            </>
          )}
          {body.length > MAX_BODY * 0.9 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {body.length}/{MAX_BODY}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {busy && <LoaderCircle className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && <p className="px-3 pb-2 text-xs text-destructive">{error}</p>}
    </form>
  )
}
