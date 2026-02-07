'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { CarPart } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface ProductCardProps {
  part: CarPart;
}

export default function ProductCard({ part }: ProductCardProps) {
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

  const discount = part.discountPrice
    ? Math.round(((part.price - part.discountPrice) / part.price) * 100)
    : 0;

  const conditionColors = {
    NEW: 'bg-green-500',
    USED: 'bg-orange-500',
    RECONDITIONED: 'bg-blue-500',
  };

  return (
    <Link href={`/parts/${part.id}`}>
      <div className="product-card group relative">
        {/* Image Container */}
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {part.images && part.images.length > 0 ? (
            <Image
              src={part.images[0]}
              alt={part.name}
              fill
              className="object-cover product-image transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="w-20 h-20 text-primary-500/30">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className={`badge ${conditionColors[part.condition]} text-white text-xs`}>
              {part.condition}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-primary-500 hover:text-white transition-colors shadow-md"
              onClick={(e) => e.preventDefault()}
              aria-label="Add to wishlist"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-primary-500 hover:text-white transition-colors shadow-md"
              onClick={(e) => e.preventDefault()}
              aria-label="Quick view"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-xs text-primary-500 font-medium mb-1">
            {part.category.name}
          </div>
          <h3 className="text-gray-900 font-semibold mb-1 line-clamp-2 group-hover:text-primary-500 transition-colors">
            {part.name}
          </h3>
          <p className="text-gray-600 text-xs mb-3 line-clamp-1">
            {part.car.make} {part.car.model} ({part.car.year})
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-900">
                Rs. {(part.discountPrice || part.price).toLocaleString()}
              </span>
              {part.discountPrice && (
                <span className="text-sm text-gray-500 line-through ml-2">
                  Rs. {part.price.toLocaleString()}
                </span>
              )}
            </div>
            {part.stock > 0 ? (
              <span className="text-xs text-green-600 font-medium">In Stock</span>
            ) : (
              <span className="text-xs text-red-600 font-medium">Out of Stock</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
