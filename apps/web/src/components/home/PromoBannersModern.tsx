'use client';

import Link from 'next/link';
import Image from 'next/image';

const promos = [
  {
    id: 1,
    title: 'Premium Brake Systems',
    subtitle: 'Up to 40% Off',
    description: 'High-performance braking parts for all vehicle types',
    cta: 'Shop Brakes',
    href: '/categories/brakes',
    image: 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=600&auto=format&fit=crop&q=80',
    bgColor: 'bg-gradient-to-br from-slate-900 to-slate-700',
    accentColor: 'text-red-400',
  },
  {
    id: 2,
    title: 'Engine Parts',
    subtitle: 'New Stock',
    description: 'Quality engine components from trusted brands',
    cta: 'Shop Engine',
    href: '/categories/engine',
    image: 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=600&auto=format&fit=crop&q=80',
    bgColor: 'bg-gradient-to-br from-blue-900 to-blue-700',
    accentColor: 'text-blue-300',
  },
];

export default function PromoBannersModern() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {promos.map((promo) => (
          <Link
            key={promo.id}
            href={promo.href}
            className={`relative overflow-hidden rounded-3xl ${promo.bgColor} min-h-[280px] group`}
          >
            {/* Background Image */}
            <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-500">
              <Image
                src={promo.image}
                alt={promo.title}
                fill
                className="object-cover"
              />
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            
            {/* Content */}
            <div className="relative z-10 p-8 h-full flex flex-col justify-center">
              <span className={`text-sm font-bold ${promo.accentColor} mb-2`}>
                {promo.subtitle}
              </span>
              <h3 className="text-3xl font-black text-white mb-2">
                {promo.title}
              </h3>
              <p className="text-gray-300 text-sm mb-6 max-w-xs">
                {promo.description}
              </p>
              <span className="inline-flex items-center gap-2 text-white font-semibold group-hover:gap-4 transition-all">
                {promo.cta}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>

            {/* Decorative Element */}
            <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/20 rounded-full group-hover:scale-125 transition-transform duration-500" />
          </Link>
        ))}
      </div>
    </section>
  );
}
