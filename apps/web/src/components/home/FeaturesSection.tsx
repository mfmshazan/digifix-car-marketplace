import { Truck, Shield, Headphones, CreditCard } from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Free Delivery',
    description: 'Free shipping on orders over Rs. 5,000',
  },
  {
    icon: Shield,
    title: 'Warranty Guarantee',
    description: '1 year warranty on all products',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Round the clock customer support',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Multiple secure payment options',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="card p-6 text-center hover:border-primary-500/50 transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-4 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-dark-400 text-sm">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
