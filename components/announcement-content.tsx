"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function AnnouncementContent({ content }: { content: string }) {
  return <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-black text-white first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 mt-6 text-lg font-black text-white first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 mt-5 text-sm font-black uppercase tracking-wide text-amber-300">{children}</h3>,
      p: ({ children }) => <p className="my-3 text-sm leading-7 text-gray-300">{children}</p>,
      ul: ({ children }) => <ul className="my-3 space-y-2 pl-5 text-sm text-gray-300 marker:text-amber-400">{children}</ul>,
      ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-5 text-sm text-gray-300 marker:font-black marker:text-amber-400">{children}</ol>,
      li: ({ children }) => <li className="pl-1 leading-6 [&>ul]:mt-2">{children}</li>,
      strong: ({ children }) => <strong className="font-black text-white">{children}</strong>,
      blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-amber-400 bg-amber-400/[0.06] px-4 py-1 text-gray-300">{children}</blockquote>,
      code: ({ children }) => <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-amber-200">{children}</code>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-bold text-blue-300 underline decoration-blue-400/40 underline-offset-4 hover:text-blue-200">{children}</a>,
      table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
      th: ({ children }) => <th className="border border-white/10 bg-white/[0.05] px-3 py-2 font-black text-white">{children}</th>,
      td: ({ children }) => <td className="border border-white/10 px-3 py-2 text-gray-300">{children}</td>,
      hr: () => <hr className="my-5 border-white/10" />,
    }}
  >{content}</ReactMarkdown>
}
