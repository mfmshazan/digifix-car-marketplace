'use client';

import Link from 'next/link';
import Image from 'next/image';

const banners = [
  {
    id: 1,
    title: 'Interior Parts',
    subtitle: 'FEATURED',
    price: 'From Rs. 5,999',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80',
    link: '/categories/Interior',
    bgColor: 'from-gray-800 to-gray-900',
  },
  {
    id: 2,
    title: 'Buy The Tires',
    subtitle: 'FOR ANY VEHICLE',
    price: 'From Rs. 5,999',
    image: 'https://images.unsplash.com/photo-1611067577475-07af7dd1ea6c?w=600&auto=format&fit=crop&q=80',
    link: '/categories/Wheels',
    bgColor: 'from-gray-700 to-gray-800',
  },
  {
    id: 3,
    title: 'Car Body Parts',
    subtitle: 'HOT SALE',
    price: 'From Rs. 5,999',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&auto=format&fit=crop&q=80',
    link: '/categories/Body Parts',
    bgColor: 'from-gray-800 to-gray-900',
  },
];

export default function PromoBanners() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <Link
            key={banner.id}
            href={banner.link}
            className="relative overflow-hidden rounded-2xl min-h-[220px] group"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.bgColor} opacity-70`} />
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-6 h-full flex flex-col justify-center">
              <span className="text-orange-400 text-xs font-semibold tracking-wider mb-2">
                {banner.subtitle}
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">
                {banner.title}
              </h3>
              <p className="text-gray-300 mb-4">
                {banner.price}
              </p>
              <span className="inline-flex items-center text-white text-sm font-medium hover:text-orange-400 transition-colors group-hover:translate-x-1 duration-300">
                Shop Now
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
