import { useLocation } from 'react-router';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">

      <div className="flex-grow flex items-center justify-center py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-8xl md:text-9xl font-bold gradient-text mb-4">
            404
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Oops! The page you're looking for doesn't exist.
          </p>
        </div>
      </div>

    </div>
  );
};

export default NotFound;
