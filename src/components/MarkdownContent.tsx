import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { preprocessGovernanceMarkdown } from '../utils/governanceMarkdown';
import './IpfsLinkModal.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const processed = preprocessGovernanceMarkdown(content);
  const rootClass = ['governance-markdown', 'governance-metadata-body', className]
    .filter(Boolean)
    .join(' ');

  return (
    <ReactMarkdown
      className={rootClass}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      linkTarget="_blank"
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
