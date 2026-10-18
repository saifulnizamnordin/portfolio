import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, X } from "lucide-react"
import { fileUrl, THUMB_SINGLE, type CommentRecord } from "@/lib/pocketbase"
import { cn } from "@/lib/utils"

interface Props {
  record: CommentRecord
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

// Full-resolution viewer. Starts fitted to the screen; clicking the image toggles 1:1 pixels.
export function Lightbox({ record, index, onIndexChange, onClose }: Props) {
  const count = record.images.length
  const filename = record.images[index]
  const original = fileUrl(record, filename)
  const [loaded, setLoaded] = useState(false)
  const [actualSize, setActualSize] = useState(false)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    setLoaded(false)
    setActualSize(false)
    setNatural(null)
  }, [original])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft" && count > 1) onIndexChange((index - 1 + count) % count)
      else if (e.key === "ArrowRight" && count > 1) onIndexChange((index + 1) % count)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener("keydown", onKey)
    }
  }, [index, count, onClose, onIndexChange])

  const controlClass =
    "inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 p-3 text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
        <span className="tabular-nums">
          {count > 1 && `${index + 1} / ${count} · `}
          {natural ? `${natural.w} × ${natural.h}` : "Loading…"}
          {loaded && <span className="hidden sm:inline"> · click image to {actualSize ? "fit screen" : "view actual size"}</span>}
        </span>
        <div className="flex gap-2">
          <a href={original} target="_blank" rel="noopener" className={controlClass} aria-label="Open original in new tab">
            <ExternalLink className="size-4" />
          </a>
          <button type="button" onClick={onClose} className={controlClass} aria-label="Close preview">
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1",
          actualSize ? "overflow-auto" : "flex items-center justify-center overflow-hidden p-2 sm:p-6",
        )}
      >
        {!loaded && (
          <img
            src={fileUrl(record, filename, THUMB_SINGLE)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto max-h-[80vh] max-w-[90vw] scale-105 object-contain blur-md"
          />
        )}
        {!loaded && <LoaderCircle className="absolute inset-0 m-auto size-8 animate-spin text-white/80" />}
        <img
          src={original}
          alt={`Attachment ${index + 1}`}
          onLoad={(e) => {
            setLoaded(true)
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }}
          onClick={(e) => {
            e.stopPropagation()
            setActualSize((v) => !v)
          }}
          className={cn(
            "relative transition-opacity",
            loaded ? "opacity-100" : "opacity-0",
            actualSize ? "m-auto block max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain",
          )}
        />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((index - 1 + count) % count)
            }}
            className={cn(controlClass, "absolute top-1/2 left-3 -translate-y-1/2")}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((index + 1) % count)
            }}
            className={cn(controlClass, "absolute top-1/2 right-3 -translate-y-1/2")}
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>
  )
}
