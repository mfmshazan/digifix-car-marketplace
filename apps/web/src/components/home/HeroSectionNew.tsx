'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HeroSectionNew() {
  return (
    <section className="relative overflow-hidden bg-white min-h-[600px] lg:min-h-[700px]">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content - Typography */}
          <div className="relative z-10">
            {/* Main Headlines */}
            <div className="space-y-2">
              {/* MAKE STORE */}
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-[#00002E] tracking-tight">
                  MAKE
                </h1>
                <span className="text-lg md:text-xl font-bold text-gray-600 tracking-widest rotate-0 writing-mode-vertical">
                  STORE
                </span>
              </div>
              
              {/* SELL PARTS */}
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-[#00002E] tracking-tight">
                  SELL
                </h1>
                <span className="text-lg md:text-xl font-bold text-gray-600 tracking-widest">
                  PARTS
                </span>
              </div>
              
              {/* EARN MONEY */}
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-[#00002E] tracking-tight">
                  EARN
                </h1>
                <span className="text-lg md:text-xl font-bold text-gray-600 tracking-widest">
                  MONEY
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/dashboard/salesman"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#00002E] hover:bg-[#000050] text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Start Selling
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/parts"
                className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-[#00002E] text-[#00002E] font-bold rounded-full transition-all duration-300 hover:bg-gray-50"
              >
                Browse Parts
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl md:text-4xl font-black text-[#00002E]">10K+</div>
                <div className="text-sm text-gray-500 mt-1">Parts Listed</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-black text-[#00002E]">5K+</div>
                <div className="text-sm text-gray-500 mt-1">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-black text-[#00002E]">500+</div>
                <div className="text-sm text-gray-500 mt-1">Active Sellers</div>
              </div>
            </div>
          </div>

          {/* Right Content - Car Image */}
          <div className="relative lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-[55%]">
            <div className="relative">
              {/* Car Image */}
              <Image
                src="/images/heroCar.png"
                alt="Premium Sports Car"
                width={1000}
                height={600}
                className="w-full h-auto object-contain drop-shadow-2xl"
                priority
              />
              
              {/* Floating Badge */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Featured</div>
                <div className="text-lg font-bold text-[#00002E]">Premium Parts</div>
                <div className="text-sm text-gray-600">Quality Guaranteed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
