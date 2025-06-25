interface CardProps {
  title?: string;
  children: React.ReactNode;
  error?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, error, style = {}, className = '' }) => (
  <div className={`card ${error ? 'error' : ''} ${className}`} style={style}>
    {title && <h4>{title}</h4>}
    {children}
  </div>
);