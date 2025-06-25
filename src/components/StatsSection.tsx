import { useState, useEffect } from 'react';

const stats = [
  {
    value: 'Soon',
    label: 'ADA Mixed',
    description: 'Total volume in our mixing pools',
  },
  {
    value: 'Soon',
    label: 'Users',
    description: 'Privacy-focused community members',
  },
  // {
  //   value: '100%',
  //   label: 'Secure',
  //   // description: 'Provably private transactions',
  //   description: 'Private transactions',
  // },
  {
    value: 'Soon',
    label: 'Community Owned',
    description: 'Governed by the community of TURN holders',
  },
  {
    value: '24/7',
    label: 'Support',
    description: 'Available for our community',
  },
];

const StatsSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    const section = document.getElementById('stats-section');
    if (section) {
      observer.observe(section);
    }

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, []);

  return (
    <section
      id="stats-section"
      className="py-20 bg-gradient-to-b from-background to-black/90 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent z-0"></div>

      {/* <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center transform transition-all duration-700 ease-out ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold mb-2 gradient-text">
                  {stat.value}
                </div>
                <div className="text-xl font-medium mb-1">{stat.label}</div>
                <p className="text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </section>
  );
};

export default StatsSection;
