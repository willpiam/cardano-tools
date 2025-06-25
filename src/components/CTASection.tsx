import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

const CTASection = () => {
  // const { toast } = useToast();

  // const handleSubscribe = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   toast({
  //     title: 'Subscribed!',
  //     description: "You've been added to our newsletter",
  //   });

  //   // Reset form
  //   const form = e.target as HTMLFormElement;
  //   form.reset();
  // };

  return (
    <section className="pt-0 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary-dark/5 opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto dark-blur rounded-2xl p-8 md:p-12 border border-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              Ready to{' '}
              <span className="gradient-text">Protect Your Privacy</span>?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-8">
              Join thousands of users safeguarding their financial privacy on
              Cardano. Get started with Turn Network today.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10">
              <Button
                onClick={() => window.open('/mix', '_blank')}
                className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium px-8 py-6 text-lg w-full sm:w-auto"
              >
                Start Mixing Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {/* <Button
                variant="outline"
                className="border-primary/30 hover:bg-primary/5 px-8 py-6 text-lg w-full sm:w-auto"
              >
                Explore Docs
              </Button> */}
            </div>

            {/* <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium mb-3 text-center">
                Stay Updated
              </h3>
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  Subscribe
                </Button>
              </form>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
