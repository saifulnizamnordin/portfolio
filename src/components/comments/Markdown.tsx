import ReactMarkdown, { type Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

// Headings are flattened so a comment can't shout over the post; inline images are dropped
// (attachments go through the upload instead, so no third-party tracking pixels).
const heading = ({ children }: { children?: React.ReactNode }) => <p className="font-semibold">{children}</p>

const components: Components = {
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="nofollow ugc noopener" className="break-words">
      {children}
    </a>
  ),
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral max-w-none break-words dark:prose-invert",
        "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0 prose-pre:my-2 prose-pre:rounded-lg prose-blockquote:my-2",
        "prose-a:underline-offset-4 prose-code:before:content-none prose-code:after:content-none",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components} disallowedElements={["img"]} unwrapDisallowed>
        {text}
      </ReactMarkdown>
    </div>
  )
}
