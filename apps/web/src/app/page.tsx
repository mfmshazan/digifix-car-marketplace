'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight, Star, ShoppingCart, ChevronRight, Zap, Shield, Truck, Headphones } from 'lucide-react';
import { carPartsApi, CarPart } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import ProductCard from '@/components/products/ProductCard';
import HeroSection from '@/components/home/HeroSection';
import SearchSection from '@/components/home/SearchSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturesSection from '@/components/home/FeaturesSection';

export default function HomePage() {
  const [featuredParts, setFeaturedParts] = useState<CarPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedParts();
  }, []);

  const loadFeaturedParts = async () => {
    try {
      setIsLoading(true);
      const response = await carPartsApi.getAll({ limit: 8 });
      if (response.success) {
        setFeaturedParts(response.data.parts);
      }
    } catch (error) {
      console.error('Failed to load featured parts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-16">
      <HeroSection />
      <SearchSection />
      <CategoriesSection />
      
      {/* Featured Products Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">Featured Parts</h2>
            <p className="section-subtitle">Premium quality car parts for your vehicle</p>
          </div>
          <Link href="/parts" className="hidden md:flex items-center gap-2 text-primary-500 hover:text-primary-400 font-medium transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-dark-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-dark-700 rounded w-1/2"></div>
                  <div className="h-6 bg-dark-700 rounded"></div>
                  <div className="h-4 bg-dark-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : featuredParts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredParts.map((part) => (
              <ProductCard key={part.id} part={part} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-dark-400">No featured parts available at the moment.</p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link href="/parts" className="btn-primary inline-flex items-center gap-2">
            View All Parts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Special Offer Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 p-8 md:p-12">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <span className="badge-blue mb-4">Limited Time Offer</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-2">
                  30% OFF on All Steering Parts
                </h2>
                <p className="text-white/80 text-lg">
                  Upgrade your driving experience with premium steering components
                </p>
              </div>
              <Link href="/parts?category=steering" className="bg-white text-primary-600 font-semibold py-4 px-8 rounded-xl hover:bg-dark-100 transition-all duration-300 transform hover:scale-105 whitespace-nowrap">
                Shop Now
              </Link>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </section>

      <FeaturesSection />

      {/* Newsletter Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="section-title mb-4">Stay Updated</h2>
          <p className="section-subtitle mb-8">
            Subscribe to our newsletter for exclusive deals and new arrivals
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
