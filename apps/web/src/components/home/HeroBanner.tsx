'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HeroBanner() {
  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Single Main Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-[400px] group">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1400&auto=format&fit=crop&q=80"
            alt="Luxury Car"
            fill
            className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center h-full max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#00002E] text-white text-xs font-semibold w-fit mb-4">
            NEW RELEASE
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Get All Original
          </h2>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight">
            Parts <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">for Your Car</span>
          </h2>
          <p className="text-gray-300 text-lg mb-6">
            Starting From <span className="text-sky-300 font-bold text-2xl">Rs. 8,399</span>
          </p>
          <Link
            href="/parts"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-full transition-all duration-300 w-fit group-hover:translate-x-1 shadow-lg"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
