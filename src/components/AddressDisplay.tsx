import React from 'react';
import { WrappedTextBlock } from './WrappedTextBlock';

interface AddressDisplayProps {
  /** The address string to render */
  address: string;
  /**
   * Desired width of the rendered block.
   * Can be either a number (interpreted as pixels) or any valid CSS width string (e.g. '15rem', '50%').
   * Default: 240 (pixels)
   */
  width?: number | string;
  /**
   * Optional additional className to forward to the wrapper element
   */
  className?: string;
  /**
   * Optional inline style overrides (merged with internal style)
   */
  style?: React.CSSProperties;
}

/**
 * A helper component to display very long strings—like wallet addresses or hashes—while constraining them to a fixed
 * width. It relies entirely on CSS `overflow-wrap: break-word` so that the browser handles the splitting. This keeps
 * the implementation extremely lightweight while ensuring that the component reacts automatically to different font
 * metrics or container sizes.
 */
export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  width = 240,
  className = '',
  style = {},
}) => (
  <WrappedTextBlock
    text={address}
    width={width}
    className={className}
    style={style}
  />
);
