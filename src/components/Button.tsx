
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({ onClick, disabled, children, style = {} }) => (
  <button
    className="btn"
    style={style}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
