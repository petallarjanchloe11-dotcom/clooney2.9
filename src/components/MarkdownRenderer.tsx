import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onGenerateImagePrompt?: (prompt: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  onGenerateImagePrompt,
}) => {
  // Check if content has [IMAGE_PROMPT: ...] tags
  const imagePromptRegex = /\[IMAGE_PROMPT:\s*([^\]]+)\]/g;
  const imagePrompts: string[] = [];
  let match;
  while ((match = imagePromptRegex.exec(content)) !== null) {
    if (match[1]) imagePrompts.push(match[1].trim());
  }

  // Remove raw tag from text display so user sees a clean message + action card
  const cleanedContent = content.replace(/\[IMAGE_PROMPT:\s*([^\]]+)\]/g, '').trim();

  return (
    <div className={`prose-clooney text-inherit ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const langMatch = /language-(\w+)/.exec(className || '');
            const language = langMatch ? langMatch[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (language || codeString.includes('\n'))) {
              return <CodeBlock language={language} code={codeString} />;
            }

            return (
              <code
                className="bg-slate-200/60 dark:bg-[#1f2a38] text-[#1e293b] dark:text-[#85dfc7] px-1.5 py-0.5 rounded text-[0.88em] font-mono border border-slate-300/40 dark:border-slate-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#85dfc7] hover:underline font-medium break-all"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-[#85dfc7] pl-3 italic text-slate-600 dark:text-slate-400 my-2">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>

      {/* Render detected image generation prompts if any */}
      {imagePrompts.length > 0 && onGenerateImagePrompt && (
        <div className="mt-4 space-y-2">
          {imagePrompts.map((promptText, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#24303e]/10 dark:bg-[#1a232f] border border-[#85dfc7]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#85dfc7] animate-ping" />
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Image Prompt: &ldquo;{promptText}&rdquo;
                </span>
              </div>
              <button
                onClick={() => onGenerateImagePrompt(promptText)}
                className="px-3 py-1.5 rounded-lg bg-[#85dfc7] hover:bg-[#9de6d3] text-[#16202b] font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <span>Generate this image</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-slate-700/60 bg-[#16202b] shadow-md text-slate-100 font-mono text-xs sm:text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1f2937] border-b border-slate-700/50 text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#85dfc7]" />
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={13} className="text-[#85dfc7]" />
              <span className="text-[#85dfc7]">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="p-4 overflow-x-auto text-[0.88em] leading-relaxed text-slate-200">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
