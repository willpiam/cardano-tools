import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import MixingInterface from '../components/MixingInterface';
import StatsSection from '../components/StatsSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <HeroSection />

        <div className="container mx-auto px-4 py-12 flex flex-col lg:flex-row items-center justify-center gap-12">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Mix Your <span className="gradient-text">Cardano Assets</span>{' '}
              With Complete Privacy
            </h2>
            <p className="text-muted-foreground mb-6">
              {/* <del>
              {/* <del>
                Turn Network provides  state-of-the-art  mixing technology, ensuring
                your transactions remain private and untraceable. Our protocol
                uses advanced cryptographic techniques to break the on-chain link
                between source and destination addresses.
              </del> */}
              Turn Network is a CoinJoin style protocol which allows you to mix your assets with those of other users.
              It takes advantage of the UTxO model employed by Cardano to break the link between inputs and outputs. 
            </p>
            <p className="text-muted-foreground">
              With support for ADA and native tokens on Cardano, Turn Network is
              your comprehensive privacy solution.
            </p>
          </div>

          <div className="lg:w-1/2 animate-fade-in">
            <MixingInterface />
          </div>
        </div>

        <FeaturesSection />
        <StatsSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
