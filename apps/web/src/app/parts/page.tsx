'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Grid, List, ChevronDown, Search, X } from 'lucide-react';
import { carPartsApi, CarPart } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import ProductDetailModal from '@/components/products/ProductDetailModal';

const conditions = ['ALL', 'NEW', 'USED', 'RECONDITIONED'];

export default function PartsPage() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [parts, setParts] = useState<CarPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CarPart | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadParts();
  }, [categoryFilter, selectedCondition]);

  const loadParts = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 20 };
      if (selectedCondition !== 'ALL') {
        params.condition = selectedCondition;
      }
      const response = await carPartsApi.getAll(params);
      if (response.success) {
        setParts(response.data.parts);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredParts = parts.filter((part) =>
    searchQuery
      ? part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.category.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const handleViewDetails = (part: CarPart) => {
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
  };

  return (
    <div className="pt-20 pb-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Car Parts</h1>
          <p className="text-gray-600">
            Browse our collection of premium car parts
            {categoryFilter && <span className="text-primary-500"> in {categoryFilter}</span>}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              {/* Condition Filter */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm hidden sm:block">Condition:</span>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {conditions.map((condition) => (
                    <button
                      key={condition}
                      onClick={() => setSelectedCondition(condition)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedCondition === condition
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="text-gray-900 font-semibold">{filteredParts.length}</span> parts
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredParts.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {filteredParts.map((part) => (
              <ProductCard key={part.id} part={part} onViewDetails={handleViewDetails} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No parts found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        part={selectedPart}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
