'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { carPartsApi, CarPart } from '@/lib/api';
import ProductCardNew from '@/components/products/ProductCardNew';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import HeroBanner from '@/components/home/HeroBanner';
import PopularCategories from '@/components/home/PopularCategories';
import PromoBanners from '@/components/home/PromoBanners';
import FeaturesBar from '@/components/home/FeaturesBar';
import NavbarNew from '@/components/layout/NavbarNew';
import FooterNew from '@/components/layout/FooterNew';

// Filter tabs for products section
const productFilters = ['All', 'Brake', 'Wheel', 'Fuel', 'Lights', 'Filter', 'Key', 'Battery'];

export default function HomePage() {
  const [featuredParts, setFeaturedParts] = useState<CarPart[]>([]);
  const [allParts, setAllParts] = useState<CarPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState<CarPart | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      setIsLoading(true);
      const response = await carPartsApi.getAll({ limit: 16 });
      if (response.success) {
        setAllParts(response.data.parts);
        setFeaturedParts(response.data.parts.slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (part: CarPart) => {
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
  };

  const filteredParts = activeFilter === 'All' 
    ? featuredParts 
    : featuredParts.filter(part => 
        part.category.name.toLowerCase().includes(activeFilter.toLowerCase()) ||
        part.name.toLowerCase().includes(activeFilter.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarNew />
      
      {/* Hero Banner Section */}
      <HeroBanner />
      
      {/* Popular Categories */}
      <PopularCategories />
      
      {/* Highest Sold Products Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Highest Sold Products
          </h2>
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {productFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === filter
                    ? 'text-orange-600 bg-orange-50 border border-orange-200'
                    : 'text-gray-600 hover:text-orange-500 border border-transparent'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredParts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredParts.slice(0, 6).map((part) => (
              <ProductCardNew key={part.id} part={part} onViewDetails={handleViewDetails} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found for this filter.</p>
          </div>
        )}
      </section>

      {/* Promotional Banners */}
      <PromoBanners />

      {/* Featured Products Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Featured Products
          </h2>
          <Link
            href="/parts"
            className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            View All Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : allParts.length > 0 ? (
          <>
            {/* Side Banner + Products Grid Layout */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Side Banner */}
              <div className="hidden lg:block relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 min-h-[400px]">
                <div className="p-6 h-full flex flex-col justify-center">
                  <span className="text-xs font-semibold text-gray-600 tracking-wider mb-2">CAR STEERING</span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium Steerings</h3>
                  <Link
                    href="/categories/Steering"
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors w-fit"
                  >
                    View All
                  </Link>
                </div>
              </div>
              
              {/* Products Grid */}
              <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {allParts.slice(0, 8).map((part) => (
                  <ProductCardNew key={part.id} part={part} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </div>

            {/* Second Row with Side Banner */}
            <div className="grid lg:grid-cols-5 gap-6 mt-6">
              {/* Products Grid */}
              <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {allParts.slice(8, 16).map((part) => (
                  <ProductCardNew key={part.id} part={part} onViewDetails={handleViewDetails} />
                ))}
              </div>
              
              {/* Side Banner */}
              <div className="hidden lg:block relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-50 min-h-[400px]">
                <div className="p-6 h-full flex flex-col justify-center">
                  <span className="text-xs font-semibold text-gray-600 tracking-wider mb-2">BRAKE PLATES</span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Hydraulic Brakes</h3>
                  <Link
                    href="/categories/Brakes"
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors w-fit"
                  >
                    View All
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        )}
      </section>

      {/* Special Offer Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 md:p-12">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&auto=format&fit=crop&q=60')] bg-cover bg-center opacity-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-orange-400 text-white text-xs font-semibold mb-4">
                  TRENDING
                </span>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  Save 50% Off
                </h2>
                <p className="text-white/80 text-lg">
                  On All Premium Car Parts This Weekend
                </p>
              </div>
              <Link 
                href="/parts" 
                className="bg-orange-400 hover:bg-orange-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 whitespace-nowrap shadow-lg"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <FeaturesBar />

      {/* Footer */}
      <FooterNew />

      {/* Product Detail Modal */}
      <ProductDetailModal
        part={selectedPart}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
