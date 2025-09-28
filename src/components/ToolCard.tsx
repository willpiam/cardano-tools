import React from 'react';

interface ToolCardProps {
  /** Heading displayed at the top of the card */
  title: string;
  /** Optional short paragraph explaining what the tool does */
  description?: React.ReactNode;
  /** Card body */
  children: React.ReactNode;
  /** When true, hide the title (used when a nested component already renders its own) */
  hideTitle?: boolean;
}

/**
 * ToolCard – Shared layout wrapper for tool sections
 *
 * Centralises styling so all on-chain/off-chain tools have the same look & feel.
 * Uses Tailwind for spacing & shadows; adapts automatically to dark mode.
 */
const ToolCard: React.FC<ToolCardProps> = ({ title, description, children, hideTitle = false }) => {
  return (
    <div className="w-full max-w-xl bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 flex flex-col gap-4">
      {!hideTitle && <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
      )}
      {children}
    </div>
  );
};

export default ToolCard;
