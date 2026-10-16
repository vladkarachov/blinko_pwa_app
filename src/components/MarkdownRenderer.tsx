import React from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onTagClick?: (tag: string) => void;
  onToggleTodo?: (todoText: string, newDone: boolean) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onTagClick,
  onToggleTodo,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = React.useState<number | null>(null);

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to format inline markdown (bold, italic, inline code, tags, links)
  const renderInline = (text: string): React.ReactNode => {
    // Regex matches tokens in order
    // 1. Tags: #tag
    // 2. Links: [text](url)
    // 3. Bold: **text**
    // 4. Italic: *text*
    // 5. Strike: ~~text~~
    // 6. Code: `code`
    const tokenRegex = /(#[a-zA-Z0-9_\u4e00-\u9fa5\-]+)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)|(`[^`]+`)/g;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.substring(lastIndex, match.index));
      }

      const matchStr = match[0];

      if (matchStr.startsWith('#') && !matchStr.includes(' ')) {
        // Tag
        const tagName = matchStr.substring(1);
        nodes.push(
          <button
            key={`tag-${keyIdx++}`}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(tagName);
            }}
            className="blinko-tag inline-flex items-center font-medium transition cursor-pointer hover:opacity-80"
          >
            #{tagName}
          </button>
        );
      } else if (matchStr.startsWith('[') && matchStr.includes('](')) {
        // Link
        const linkMatch = matchStr.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          nodes.push(
            <a
              key={`link-${keyIdx++}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--secondary)] hover:underline inline-flex items-center gap-0.5"
            >
              {linkMatch[1]}
            </a>
          );
        }
      } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        // Bold
        nodes.push(
          <strong key={`bold-${keyIdx++}`} className="font-semibold text-[var(--foreground)]">
            {matchStr.slice(2, -2)}
          </strong>
        );
      } else if (matchStr.startsWith('*') && matchStr.endsWith('*')) {
        // Italic
        nodes.push(
          <em key={`italic-${keyIdx++}`} className="italic text-[var(--foreground)]">
            {matchStr.slice(1, -1)}
          </em>
        );
      } else if (matchStr.startsWith('~~') && matchStr.endsWith('~~')) {
        // Strikethrough
        nodes.push(
          <del key={`strike-${keyIdx++}`} className="line-through text-[var(--desc)]">
            {matchStr.slice(2, -2)}
          </del>
        );
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        // Inline code
        nodes.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--secondary)] font-mono text-[12px] border border-[var(--border)]"
          >
            {matchStr.slice(1, -1)}
          </code>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.substring(lastIndex));
    }

    return nodes;
  };

  // Split lines and parse blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let codeBlockCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const fullCode = codeBuffer.join('\n');
        const currentIdx = codeBlockCount++;
        elements.push(
          <div key={`code-blk-${currentIdx}`} className="relative my-2 rounded-lg bg-[var(--md-editor-bg)] border border-[var(--md-editor-border)] overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--md-editor-border)] text-[11px] text-[var(--desc)]">
              <span>{codeLang || 'code'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(fullCode, currentIdx);
                }}
                className="flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer"
              >
                {copiedCodeIdx === currentIdx ? (
                  <>
                    <Check className="w-3 h-3 text-[var(--secondary)]" />
                    <span className="text-[var(--secondary)]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[var(--md-editor-text)] leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Check for Todo items: - [ ] or - [x]
    const todoMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      const isChecked = todoMatch[2].toLowerCase() === 'x';
      const text = todoMatch[3];
      elements.push(
        <div
          key={`todo-${i}`}
          className="flex items-start gap-2.5 my-1 group cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTodo?.(text, !isChecked);
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--accent)] accent-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span
            className={`text-sm leading-relaxed ${
              isChecked ? 'line-through text-[var(--desc)]' : 'text-[var(--foreground)]'
            }`}
          >
            {renderInline(text)}
          </span>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-[var(--foreground)] mt-2 mb-1">
          {renderInline(line.substring(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-[var(--foreground)] mt-3 mb-1">
          {renderInline(line.substring(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-[var(--foreground)] mt-3 mb-1">
          {renderInline(line.substring(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[var(--secondary)] pl-3 py-0.5 my-1.5 text-[var(--desc)] italic text-sm"
        >
          {renderInline(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List
    if (line.match(/^(\s*)[-*+]\s+(.*)$/)) {
      const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)!;
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-0.5 text-sm text-[var(--foreground)]">
          <span className="text-[var(--secondary)] select-none mt-0.5">•</span>
          <span className="flex-1">{renderInline(listMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Empty line / paragraph break
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-[var(--foreground)] leading-relaxed break-words">
        {renderInline(line)}
      </p>
    );
  }

  // If code block remains unclosed
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="unclosed-code" className="p-3 my-2 rounded-lg bg-[var(--md-editor-bg)] border border-[var(--md-editor-border)] font-mono text-xs overflow-x-auto text-[var(--md-editor-text)]">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1 select-text">{elements}</div>;
};
