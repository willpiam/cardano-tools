import { Link } from 'react-router';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className, size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <Link to={'/'} className={cn('relative flex items-center', className)}>
      <img
        // src="/lovable-uploads/aabec96b-2086-4ee8-a5dd-87f53bc44f50.png"
        src="/new-logo.PNG"
        alt="Turn Network Logo"
        // className={cn('object-contain', sizeClasses[size])}
        className="h-10  w-44 sm:w-60 object-contain"
      />
      {/* <span className="ml-3 font-bold tracking-tight text-xl md:text-2xl gradient-text">
        Turn Network
      </span> */}
    </Link>
  );
};

export default Logo;
