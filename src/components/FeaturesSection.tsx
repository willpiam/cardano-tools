import { Shield, RefreshCw, Zap, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

const features = [
  {
    icon: Shield,
    title: 'Maximum Privacy',
    description:
      'Our mixing protocol ensures your transactions remain completely private and untraceable on the Cardano blockchain.',
  },
  {
    icon: RefreshCw,
    title: 'Multi-Token Support',
    description:
      'Mix ADA and any native Cardano tokens with equal levels of privacy and security.',
  },
  {
    icon: Zap,
    title: 'Fast & Efficient Mixing',
    description:
      'Mix your ADA and Cardano native tokens within minutes of joining the mixing ceremony.',
  },
  {
    icon: Lock,
    title: 'Built for Cardano',
    description:
      'Tailor-made for ADA and Cardano native tokens, leveraging the security of the UTxO model.',
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  return (
    <div
      className="relative p-6 rounded-xl overflow-hidden dark-blur border border-primary/10 h-full"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

      <div className="relative z-10">
        <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
          <feature.icon className="w-6 h-6 text-black" />
        </div>

        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
        <p className="text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="gradient-text">Turn Network</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {/* Our cutting-edge technology provides unmatched privacy features for
            Cardano users */}
            Undo KYC, anonymize your assets, and break the link between sender and recipient.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
