'use client';

import Image from 'next/image';
import { ShoppingCart, Heart, Eye, Star, Check, X } from 'lucide-react';
import { CarPart } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface ProductCardNewProps {
  part: CarPart;
  onViewDetails?: (part: CarPart) => void;
}

export default function ProductCardNew({ part, onViewDetails }: ProductCardNewProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: part.id,
      name: part.name,
      price: part.price,
      discountPrice: part.discountPrice,
      image: part.images?.[0],
      carInfo: `${part.car.make} ${part.car.model} (${part.car.year})`,
    });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(part);
    }
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(part);
    }
  };

  const discount = part.discountPrice
    ? Math.round(((part.price - part.discountPrice) / part.price) * 100)
    : 0;

  const inStock = part.stock > 0;
  const isNew = part.condition === 'NEW';

  return (
    <div onClick={handleCardClick} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden bg-gray-50">
        {part.images && part.images.length > 0 ? (
          <Image
            src={part.images[0]}
            alt={part.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="w-20 h-20 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                <circle cx="7.5" cy="14.5" r="1.5"/>
                <circle cx="16.5" cy="14.5" r="1.5"/>
              </svg>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
              {discount}% Off
            </span>
          )}
          {isNew && discount === 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
              Hot
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors shadow-md"
            onClick={(e) => e.stopPropagation()}
            aria-label="Add to wishlist"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors shadow-md"
            onClick={(e) => e.stopPropagation()}
            aria-label="Compare"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors shadow-md"
            onClick={(e) => e.stopPropagation()}
            aria-label="Wishlist"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-3 right-3 w-8 h-8 bg-orange-400 hover:bg-orange-500 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
          aria-label="Add to cart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Tag */}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {part.category.name}
        </span>
        
        {/* Product Name */}
        <h3 className="text-gray-900 font-semibold mt-1 mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors text-sm">
          {part.name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          {part.discountPrice ? (
            <>
              <span className="text-sm text-gray-400 line-through">
                Rs. {part.price.toLocaleString()}
              </span>
              <span className="text-lg font-bold text-red-500">
                Rs. {part.discountPrice.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-red-500">
              Rs. {part.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">(2)</span>
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-1">
          {inStock ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">In Stock</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Stock Out</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
