
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({ onClick, disabled, children, style = {} }) => (
  <button
    className="btn"
    style={{
      padding: '0.5rem 0.75rem',
      backgroundColor: '#ffa722',
      color: '#111111',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      fontFamily: 'inherit',
      opacity: disabled ? 0.7 : 1,
      ...style,
    }}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
