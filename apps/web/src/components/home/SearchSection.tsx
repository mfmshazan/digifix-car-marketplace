'use client';

import { useState } from 'react';
import { Search, Car, Loader2, X, ChevronRight } from 'lucide-react';
import { carPartsApi, CarPart } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';

interface SearchResult {
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    numberPlate: string;
    engineType?: string;
  };
  parts: CarPart[];
}

export default function SearchSection() {
  const [numberPlate, setNumberPlate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numberPlate.trim()) return;

    try {
      setIsSearching(true);
      setError(null);
      const response = await carPartsApi.searchByNumberPlate(numberPlate.trim());
      
      if (response.success && response.data) {
        setSearchResult(response.data);
      } else {
        setError(`No car found with number plate "${numberPlate.toUpperCase()}"`);
        setSearchResult(null);
      }
    } catch (err) {
      setError('Failed to search. Please try again.');
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setNumberPlate('');
    setSearchResult(null);
    setError(null);
  };

  return (
    <section id="search" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="section-title mb-2">Find Parts for Your Car</h2>
          <p className="section-subtitle">Enter your car's number plate to find compatible parts instantly</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Car className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={numberPlate}
              onChange={(e) => setNumberPlate(e.target.value.toUpperCase())}
              placeholder="Enter Number Plate (e.g., CAA-1234)"
              className="input-field pl-12 pr-36 py-4 text-lg uppercase tracking-wider"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              {numberPlate && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-2 text-gray-400 hover:text-gray-700 mr-1"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching || !numberPlate.trim()}
                className="btn-primary py-2 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600">{error}</p>
              <p className="text-gray-600 text-sm mt-2">
                Please check the number plate and try again, or browse our catalog manually.
              </p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResult && (
          <div className="max-w-7xl mx-auto">
            {/* Car Info Card */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 mb-8 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <Car className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {searchResult.car.make} {searchResult.car.model} ({searchResult.car.year})
                  </h3>
                  <p className="text-white/80">
                    Number Plate: <span className="text-white font-semibold">{searchResult.car.numberPlate}</span>
                    {searchResult.car.engineType && (
                      <span className="ml-4">Engine: {searchResult.car.engineType}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Parts Grid */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Available Parts ({searchResult.parts.length})
              </h3>
            </div>

            {searchResult.parts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResult.parts.map((part) => (
                  <ProductCard key={part.id} part={part} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-gray-600">No parts available for this vehicle at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Tips */}
        {!searchResult && !error && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">🚗</div>
                <div className="text-sm text-gray-600">Works with all vehicle types</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm text-gray-600">Instant compatible part search</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">✓</div>
                <div className="text-sm text-gray-600">100% accurate matching</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
