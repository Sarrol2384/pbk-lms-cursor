import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import type { Components } from 'react-markdown'

const components: Components = {
  h1({ children }) {
    return <h2 className="mb-3 mt-5 text-xl font-bold text-gray-900">{children}</h2>
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-5 text-lg font-bold text-gray-900">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="mb-2 mt-4 text-base font-semibold text-gray-900">{children}</h3>
  },
  p({ children }) {
    return <p className="mb-3 leading-relaxed">{children}</p>
  },
  ul({ children }) {
    return <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
  },
  ol({ children }) {
    return <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
  },
  a({ href, children }) {
    const external = !!href && /^https?:/i.test(href)
    return (
      <a
        href={href}
        className="break-words text-blue-600 hover:underline"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    )
  },
  img({ alt, src }) {
    // eslint-disable-next-line @next/next/no-img-element -- lesson images are remote author URLs
    return <img src={src} alt={alt ?? ''} className="my-3 h-auto max-w-full rounded-lg" />
  },
  pre({ children }) {
    return <pre className="my-4 max-w-full overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs">{children}</pre>
  },
  code({ children }) {
    return <code className="break-words">{children}</code>
  },
  blockquote({ children }) {
    return <blockquote className="my-3 border-l-4 border-gray-200 pl-3 text-gray-600">{children}</blockquote>
  },
  table({ children }) {
    return (
      <div className="my-4 max-w-full overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left text-sm">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-gray-50">{children}</thead>
  },
  th({ children }) {
    return <th className="border border-gray-200 px-3 py-2 font-semibold text-gray-900">{children}</th>
  },
  td({ children }) {
    return <td className="border border-gray-200 px-3 py-2 align-top">{children}</td>
  },
}

export function LessonContent({ content }: { content: string }) {
  return (
    <div className="lesson-content max-w-full break-words text-sm leading-relaxed text-gray-700 [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_video]:h-auto [&_video]:max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
