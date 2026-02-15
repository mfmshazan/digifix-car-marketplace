'use client';

import { Truck, Shield, Headphones, CreditCard, Award, RotateCcw } from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On orders over Rs. 10,000',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    description: '100% secure transactions',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: RotateCcw,
    title: 'Easy Returns',
    description: '30-day return policy',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Dedicated customer support',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Award,
    title: 'Quality Assured',
    description: 'Verified sellers only',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payment',
    description: 'Multiple payment options',
    color: 'bg-pink-50 text-pink-600',
  },
];

export default function FeaturesBarModern() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#00002E] mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
