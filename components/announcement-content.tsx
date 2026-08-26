"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function AnnouncementContent({ content }: { content: string }) {
  return <div className="py-5"><ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => <h1 className="mb-4 mt-7 text-2xl font-black tracking-tight text-white first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-3 mt-7 flex items-center gap-2 text-xl font-black tracking-tight text-white first:mt-0 before:h-5 before:w-1 before:rounded-full before:bg-gradient-to-b before:from-blue-400 before:to-red-500">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-3 mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">{children}</h3>,
      p: ({ children }) => <p className="my-3 text-sm leading-7 text-gray-300">{children}</p>,
      ul: ({ children }) => <ul className="my-4 grid list-none gap-2.5 p-0 text-sm text-gray-300 [&>li]:rounded-xl [&>li]:border [&>li]:border-white/[0.07] [&>li]:border-l-blue-500/40 [&>li]:bg-white/[0.025] [&>li]:px-4 [&>li]:py-3 [&>li]:shadow-sm [&>li]:shadow-black/10">{children}</ul>,
      ol: ({ children }) => <ol className="my-4 list-decimal space-y-2.5 pl-6 text-sm text-gray-300 marker:font-black marker:text-red-400">{children}</ol>,
      li: ({ children }) => <li className="leading-6 transition-colors hover:border-blue-400/20 hover:bg-blue-400/[0.025] [&>ul]:mt-2">{children}</li>,
      strong: ({ children }) => <strong className="font-black text-white">{children}</strong>,
      blockquote: ({ children }) => <blockquote className="my-5 rounded-xl border border-blue-400/15 bg-gradient-to-r from-blue-500/[0.08] via-transparent to-red-500/[0.04] px-4 py-1 text-gray-300 shadow-inner">{children}</blockquote>,
      code: ({ children }) => <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[0.9em] text-blue-200">{children}</code>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-bold text-blue-300 underline decoration-blue-400/40 underline-offset-4 hover:text-blue-200">{children}</a>,
      table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.08]"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
      th: ({ children }) => <th className="border-b border-white/10 bg-white/[0.05] px-3 py-2.5 font-black text-white">{children}</th>,
      td: ({ children }) => <td className="border-t border-white/[0.06] px-3 py-2.5 text-gray-300">{children}</td>,
      hr: () => <hr className="my-5 border-white/10" />,
    }}
  >{content}</ReactMarkdown></div>
}
