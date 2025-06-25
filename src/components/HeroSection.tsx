import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { ArrowDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToNextSection = () => {
    const nextSection = document.getElementById('features');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background z-0"></div>

      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-primary/5 to-transparent mix-blend-overlay opacity-40"></div>

      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl opacity-20 animate-flow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-dark/10 rounded-full filter blur-3xl opacity-20 animate-flow animation-delay-2000"></div>
      </div>

      <div className="container relative z-10 max-w-6xl mx-auto text-center space-y-8 mt-16">
        <div
          className={`transition-all duration-1000 delay-300 ${
            isVisible
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-10'
          }`}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Private Transactions on{' '}
            <span className="gradient-text">Cardano</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {/* Turn Network provides uncompromising privacy for ADA and native */}
            Turn Network provides privacy for ADA and native
            {/* tokens, ensuring your financial sovereignty on the Cardano */}
            tokens, helping to ensure your financial sovereignty on the Cardano
            blockchain.
          </p>
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-700 ${
            isVisible
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-10'
          }`}
        >
          <Button
            className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium px-8 py-6 text-lg"
            asChild
          >
            <Link to="/mix">
              Launch App <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {/* <Button
            variant="outline"
            className="border-primary/30 hover:bg-primary/5 px-8 py-6 text-lg"
          >
            Learn More
          </Button> */}
        </div>
      </div>

      <div
        className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 delay-1200 cursor-pointer ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={scrollToNextSection}
      >
        <ArrowDown className="w-6 h-6 text-primary animate-pulse" />
      </div>
    </section>
  );
};

export default HeroSection;
