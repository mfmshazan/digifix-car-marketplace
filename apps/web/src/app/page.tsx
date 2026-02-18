'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { carPartsApi, CarPart } from '@/lib/api';
import ProductCardModern from '@/components/products/ProductCardModern';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import HeroSectionNew from '@/components/home/HeroSectionNew';
import VehicleTypesSection from '@/components/home/VehicleTypesSection';
import PopularCategories from '@/components/home/PopularCategories';
import FeaturesBarModern from '@/components/home/FeaturesBarModern';
import PromoBannersModern from '@/components/home/PromoBannersModern';
import NavbarModern from '@/components/layout/NavbarModern';
import FooterModern from '@/components/layout/FooterModern';

// Filter tabs for products section
const productFilters = ['All', 'Brakes', 'Engine', 'Filters', 'Electrical', 'Suspension', 'Interior'];

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
        part.category?.name?.toLowerCase().includes(activeFilter.toLowerCase()) ||
        part.name.toLowerCase().includes(activeFilter.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-white">
      <NavbarModern />
      
      {/* Hero Section */}
      <HeroSectionNew />

      {/* Vehicle Types */}
      <VehicleTypesSection />

      {/* Features Bar */}
      <FeaturesBarModern />
      
      {/* Popular Categories */}
      <PopularCategories />
      
      {/* Featured Products Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#00002E]">
                Featured Products
              </h2>
              <p className="text-gray-500 mt-2">Discover our most popular car parts</p>
            </div>
          
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {productFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                    activeFilter === filter
                      ? 'bg-[#00002E] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-[#00002E]" />
            </div>
          ) : filteredParts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredParts.map((part) => (
                <ProductCardModern key={part.id} part={part} onViewDetails={handleViewDetails} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <p className="text-gray-500">No products found for this filter.</p>
            </div>
          )}

          {/* View All Button */}
          <div className="text-center mt-10">
            <Link
              href="/parts"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#00002E] text-white font-semibold rounded-full hover:bg-[#000050] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              View All Products
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Promotional Banners */}
      <PromoBannersModern />

      {/* Latest Arrivals Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#00002E]">
                Latest Arrivals
              </h2>
              <p className="text-gray-500 mt-2">New parts added to our catalog</p>
            </div>
            <Link
              href="/parts"
              className="text-sm font-medium text-[#00002E] hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-[#00002E]" />
            </div>
          ) : allParts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allParts.slice(0, 8).map((part) => (
                <ProductCardModern key={part.id} part={part} onViewDetails={handleViewDetails} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <p className="text-gray-500">No products available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-[#00002E] mb-3">
                Subscribe to Our Newsletter
              </h3>
              <p className="text-gray-600">
                Get the latest updates on new parts, deals, and automotive tips.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00002E] focus:border-transparent"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-[#00002E] hover:bg-[#000050] text-white font-bold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Subscribe
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterModern />

      {/* Product Detail Modal */}
      <ProductDetailModal
        part={selectedPart}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
