import React from 'react';

export interface WrappedTextBlockProps {
  /** Long arbitrary text to display */
  text: string;
  /** Width constraint (pixels if number) */
  width?: number | string;
  /** Additional className */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * Generic component for displaying a long string within a fixed width. It simply
 * applies CSS rules that force the text to wrap/break so that it never exceeds
 * the given width.
 */
export const WrappedTextBlock: React.FC<WrappedTextBlockProps> = ({
  text,
  width = 240,
  className = '',
  style = {},
}) => {
  const computedWidth = typeof width === 'number' ? `${width}px` : width;

  const combinedStyle: React.CSSProperties = {
    width: computedWidth,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    ...style,
  };

  return (
    <div className={className} style={combinedStyle} data-testid="wrapped-text-block">
      {text}
    </div>
  );
};
