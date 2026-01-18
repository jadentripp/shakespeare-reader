import { cn } from "@/lib/utils"
import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CodeBlock, CodeBlockCode } from "./code-block"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
  onCitationClick?: (index: number, snippet?: string) => void
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  // Pre-process <cite> tags into a unique format that won't be mangled by Markdown
  // We use a syntax like CITE_START[index|snippet]textCITE_END
  const processed = markdown.replace(
    /<cite\s+snippet="([^"]*)"\s+index="([^"]*)">([\s\S]*?)<\/cite>/g,
    (_, snippet, index, text) => `__CITE_START__[${index}|${snippet}]${text}__CITE_END__`
  );

  const tokens = marked.lexer(processed)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    // @ts-ignore
    const isInline = !props.node?.position?.start.line || props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      return (
        <span
          className={cn(
            "bg-primary-foreground rounded-sm px-1 font-mono text-sm",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)

    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
    onCitationClick,
  }: {
    content: string
    components?: Partial<Components>
    onCitationClick?: (index: number, snippet?: string) => void
  }) {
    const processedComponents: Partial<Components> = {
      ...components,
      // Handle our custom cite markers
      p: function ParagraphComponent({ children, ...props }) {
        const processNode = (node: any): any => {
          if (typeof node === 'string') {
            // First handle our new __CITE__ format
            const citeParts = node.split(/(__CITE_START__\[[^\]]*\][\s\S]*?__CITE_END__)/g);
            const processedCiteParts = citeParts.flatMap((part, i) => {
              const citeMatch = part.match(/__CITE_START__\[([^|]*)\|([^\]]*)\]([\s\S]*?)__CITE_END__/);
              if (citeMatch) {
                const index = parseInt(citeMatch[1], 10);
                const snippet = citeMatch[2];
                const text = citeMatch[3];
                return (
                  <span
                    key={`cite-${i}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCitationClick?.(index, snippet);
                    }}
                    className="cursor-pointer bg-primary/10 text-primary border-b border-primary/40 hover:bg-primary/20 transition-colors px-0.5 rounded-sm italic"
                    title={`Click to see: "${snippet}"`}
                  >
                    {text}
                  </span>
                );
              }
              
              // Then handle legacy [1] format within the remaining string parts
              const parts = part.split(/(\[\d+\])/g);
              return parts.map((subPart, j) => {
                const match = subPart.match(/^\[(\d+)\]$/);
                if (match) {
                  const id = parseInt(match[1], 10);
                  return (
                    <sup
                      key={`legacy-${i}-${j}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCitationClick?.(id);
                      }}
                      className="cursor-pointer text-primary hover:text-primary/70 font-bold px-1 select-none inline-block align-baseline hover:scale-110 transition-transform underline decoration-dotted underline-offset-2"
                      style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }}
                    >
                      [{id}]
                    </sup>
                  );
                }
                return subPart;
              });
            });
            return processedCiteParts;
          }
          if (Array.isArray(node)) {
            return node.map((child, i) => <span key={i}>{processNode(child)}</span>);
          }
          if (node && typeof node === 'object' && node.props && node.props.children) {
            return {
              ...node,
              props: {
                ...node.props,
                children: processNode(node.props.children)
              }
            };
          }
          return node;
        };

        return <p {...props}>{processNode(children)}</p>;
      },
      li: function LiComponent({ children, ...props }) {
        const processNode = (node: any): any => {
          if (typeof node === 'string') {
            const citeParts = node.split(/(__CITE_START__\[[^\]]*\][\s\S]*?__CITE_END__)/g);
            const processedCiteParts = citeParts.flatMap((part, i) => {
              const citeMatch = part.match(/__CITE_START__\[([^|]*)\|([^\]]*)\]([\s\S]*?)__CITE_END__/);
              if (citeMatch) {
                const index = parseInt(citeMatch[1], 10);
                const snippet = citeMatch[2];
                const text = citeMatch[3];
                return (
                  <span
                    key={`cite-${i}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCitationClick?.(index, snippet);
                    }}
                    className="cursor-pointer bg-primary/10 text-primary border-b border-primary/40 hover:bg-primary/20 transition-colors px-0.5 rounded-sm italic"
                    title={`Click to see: "${snippet}"`}
                  >
                    {text}
                  </span>
                );
              }

              const parts = part.split(/(\[\d+\])/g);
              return parts.map((subPart, j) => {
                const match = subPart.match(/^\[(\d+)\]$/);
                if (match) {
                  const id = parseInt(match[1], 10);
                  return (
                    <sup
                      key={`legacy-${i}-${j}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCitationClick?.(id);
                      }}
                      className="cursor-pointer text-primary hover:text-primary/70 font-bold px-1 select-none inline-block align-baseline hover:scale-110 transition-transform underline decoration-dotted underline-offset-2"
                      style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }}
                    >
                      [{id}]
                    </sup>
                  );
                }
                return subPart;
              });
            });
            return processedCiteParts;
          }
          if (Array.isArray(node)) {
            return node.map((child, i) => <span key={i}>{processNode(child)}</span>);
          }
          if (node && typeof node === 'object' && node.props && node.props.children) {
            return {
              ...node,
              props: {
                ...node.props,
                children: processNode(node.props.children)
              }
            };
          }
          return node;
        };
        return <li {...props}>{processNode(children)}</li>;
      }
    };

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        // @ts-ignore - custom components
        components={processedComponents}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content && prevProps.onCitationClick === nextProps.onCitationClick
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
  onCitationClick,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
