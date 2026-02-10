'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Filter, Loader2, Package, ShoppingCart, Check } from 'lucide-react';
import NavbarModern from '@/components/layout/NavbarModern';
import FooterModern from '@/components/layout/FooterModern';
import { categoriesApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface CarPart {
  id: string;
  name: string;
  description?: string;
  partNumber?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  images: string[];
  seller: { id: string; name: string };
  car: { id: string; numberPlate: string; make: string; model: string; year: number };
  category: { id: string; name: string; icon?: string };
}

interface CategoryData {
  category: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
  };
  carParts: CarPart[];
  products: any[];
  pagination: {
    page: number;
    limit: number;
    totalCarParts: number;
    totalProducts: number;
    total: number;
  };
}

export default function CategoryPartsPage() {
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName as string);
  
  const [data, setData] = useState<CategoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());
  
  const { addItem } = useCartStore();

  useEffect(() => {
    if (categoryName) {
      loadCategoryParts();
    }
  }, [categoryName, page]);

  const loadCategoryParts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await categoriesApi.getPartsByName(categoryName, { page, limit: 20 });
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to load parts');
      }
    } catch (err) {
      console.error('Error loading category parts:', err);
      setError('Failed to load parts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (part: CarPart) => {
    addItem({
      id: part.id,
      name: part.name,
      price: part.price,
      discountPrice: part.discountPrice,
      image: part.images?.[0],
      carInfo: `${part.car.make} ${part.car.model} (${part.car.year})`,
    });
    
    setAddedToCart(prev => new Set(prev).add(part.id));
    setTimeout(() => {
      setAddedToCart(prev => {
        const newSet = new Set(prev);
        newSet.delete(part.id);
        return newSet;
      });
    }, 2000);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'NEW': return 'bg-green-100 text-green-700';
      case 'USED': return 'bg-blue-100 text-blue-700';
      case 'REFURBISHED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarModern />
      
      <main className="pt-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-6">
          <div className="container mx-auto px-4">
            <Link 
              href="/categories" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
                {data?.category?.description && (
                  <p className="text-gray-600 mt-1">{data.category.description}</p>
                )}
                {data?.pagination && (
                  <p className="text-sm text-gray-500 mt-2">
                    {data.pagination.total} parts available
                  </p>
                )}
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Parts Grid */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={loadCategoryParts} className="btn-primary">
                Try Again
              </button>
            </div>
          ) : data?.carParts.length === 0 && data?.products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Parts Found</h3>
              <p className="text-gray-500 mb-6">
                No parts available in the {categoryName} category yet.
              </p>
              <Link href="/categories" className="btn-primary">
                Browse Other Categories
              </Link>
            </div>
          ) : (
            <>
              {/* Car Parts */}
              {data?.carParts && data.carParts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {data.carParts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group"
                    >
                      {/* Image */}
                      <div className="relative h-48 bg-gray-100">
                        {part.images && part.images.length > 0 ? (
                          <Image
                            src={part.images[0]}
                            alt={part.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                        
                        {/* Condition Badge */}
                        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-semibold ${getConditionColor(part.condition)}`}>
                          {part.condition}
                        </span>
                        
                        {/* Stock Badge */}
                        {part.stock <= 5 && part.stock > 0 && (
                          <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            Only {part.stock} left
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <p className="text-xs text-primary-600 font-medium mb-1">
                          {part.car.make} {part.car.model} ({part.car.year})
                        </p>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {part.name}
                        </h3>
                        
                        {part.partNumber && (
                          <p className="text-xs text-gray-500 mb-2">
                            Part #: {part.partNumber}
                          </p>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl font-bold text-primary-600">
                            Rs. {(part.discountPrice || part.price).toLocaleString()}
                          </span>
                          {part.discountPrice && (
                            <span className="text-sm text-gray-400 line-through">
                              Rs. {part.price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          onClick={() => handleAddToCart(part)}
                          disabled={part.stock <= 0 || addedToCart.has(part.id)}
                          className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                            addedToCart.has(part.id)
                              ? 'bg-green-500 text-white'
                              : part.stock <= 0
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          {addedToCart.has(part.id) ? (
                            <>
                              <Check className="w-4 h-4" />
                              Added!
                            </>
                          ) : part.stock <= 0 ? (
                            'Out of Stock'
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Add to Cart
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data?.pagination && data.pagination.total > data.pagination.limit && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-600">
                    Page {page} of {Math.ceil(data.pagination.total / data.pagination.limit)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(data.pagination.total / data.pagination.limit)}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <FooterModern />
    </div>
  );
}
