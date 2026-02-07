'use client';

import Link from 'next/link';
import { 
  Cog, 
  Disc, 
  Filter, 
  Zap, 
  Car, 
  Gauge, 
  Wrench, 
  CircleDot 
} from 'lucide-react';

const categories = [
  { id: '1', name: 'Engine', icon: Cog, color: 'bg-primary-500', count: 1250 },
  { id: '2', name: 'Brakes', icon: Disc, color: 'bg-red-500', count: 890 },
  { id: '3', name: 'Filters', icon: Filter, color: 'bg-orange-500', count: 560 },
  { id: '4', name: 'Electrical', icon: Zap, color: 'bg-yellow-500', count: 720 },
  { id: '5', name: 'Suspension', icon: Car, color: 'bg-green-500', count: 430 },
  { id: '6', name: 'Steering', icon: CircleDot, color: 'bg-blue-500', count: 380 },
  { id: '7', name: 'Transmission', icon: Gauge, color: 'bg-purple-500', count: 290 },
  { id: '8', name: 'Accessories', icon: Wrench, color: 'bg-pink-500', count: 650 },
];

export default function CategoriesSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="section-title mb-2">Shop by Category</h2>
        <p className="section-subtitle">Browse our wide selection of car parts by category</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={`/parts?category=${category.name.toLowerCase()}`}
              className="group"
            >
              <div className="card p-4 text-center hover:scale-105 transition-all duration-300">
                <div className={`w-14 h-14 mx-auto mb-3 rounded-xl ${category.color}/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 text-${category.color.split('-')[1]}-500`} style={{ color: category.color === 'bg-primary-500' ? '#2563EB' : undefined }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {category.count}+ items
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
