'use client';

import { Truck, ThumbsUp, Headphones, Shield, Phone } from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Same Day Product Delivery',
  },
  {
    icon: ThumbsUp,
    title: '100% Customer Satisfaction',
  },
  {
    icon: Headphones,
    title: 'Help And Access Is Our Mission',
  },
  {
    icon: Shield,
    title: '100% Quality Car Accessories',
  },
  {
    icon: Phone,
    title: '24/7 Support For Clients',
  },
];

export default function FeaturesBar() {
  return (
    <section className="bg-orange-500 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 justify-center md:justify-start"
              >
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-sm font-medium hidden md:block">
                  {feature.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
