'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Car, ArrowRight } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary-500">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
        {/* Blue accent shapes */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-6 animate-pulse-glow">
              #1 Car Parts Marketplace
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Choose Your
              <span className="block text-white">Perfect Car Parts</span>
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto lg:mx-0">
              Find premium quality car parts instantly by searching your vehicle's number plate. 
              Browse through thousands of genuine and aftermarket parts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/parts" className="btn-primary inline-flex items-center justify-center gap-2">
                <Search className="w-5 h-5" />
                Browse Parts
              </Link>
              <Link href="#search" className="btn-secondary inline-flex items-center justify-center gap-2">
                <Car className="w-5 h-5" />
                Search by Number Plate
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-white/80 text-sm">Products</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">5K+</div>
                <div className="text-white/80 text-sm">Happy Customers</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-white/80 text-sm">Verified Sellers</div>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Main car illustration placeholder */}
              <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse-glow"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm flex items-center justify-center">
                <Car className="w-32 h-32 text-white opacity-60" />
              </div>
              
              {/* Floating elements */}
              <div className="absolute top-10 right-10 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 animate-float">
                <div className="text-sm font-semibold text-white">Premium Parts</div>
                <div className="text-xs text-white/80">30% OFF</div>
              </div>
              
              <div className="absolute bottom-20 left-0 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 animate-float [animation-delay:1s]">
                <div className="text-sm font-semibold text-white">Free Delivery</div>
                <div className="text-xs text-white/80">Orders over Rs. 5000</div>
              </div>

              <div className="absolute bottom-10 right-20 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 animate-float [animation-delay:2s]">
                <div className="text-sm font-semibold text-white">Warranty</div>
                <div className="text-xs text-white/80">1 Year Guarantee</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
          <div className="w-1.5 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
