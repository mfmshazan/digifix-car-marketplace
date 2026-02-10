'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';
import { CarPart } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface ProductCardModernProps {
  part: CarPart;
  onViewDetails?: (part: CarPart) => void;
}

export default function ProductCardModern({ part, onViewDetails }: ProductCardModernProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: part.id,
      name: part.name,
      price: part.discountPrice || part.price,
      image: part.images?.[0],
      carInfo: part.car ? `${part.car.make} ${part.car.model} (${part.car.year})` : '',
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const discount = part.discountPrice 
    ? Math.round(((part.price - part.discountPrice) / part.price) * 100)
    : 0;

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails?.(part)}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {part.images && part.images.length > 0 ? (
          <Image
            src={part.images[0]}
            alt={part.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
            </svg>
          </div>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{discount}%
          </div>
        )}

        {/* Condition Badge */}
        <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-lg ${
          part.condition === 'NEW' 
            ? 'bg-green-500 text-white' 
            : part.condition === 'USED' 
            ? 'bg-orange-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          {part.condition}
        </div>

        {/* Action Buttons - Show on Hover */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={handleAddToCart}
            title="Add to Cart"
            aria-label="Add to Cart"
            className="p-3 bg-white rounded-full hover:bg-[#00002E] hover:text-white transition-colors shadow-lg"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewDetails?.(part)}
            title="View Details"
            aria-label="View Details"
            className="p-3 bg-white rounded-full hover:bg-[#00002E] hover:text-white transition-colors shadow-lg"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={handleWishlist}
            title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            className={`p-3 rounded-full transition-colors shadow-lg ${
              isWishlisted 
                ? 'bg-red-500 text-white' 
                : 'bg-white hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
          {part.category?.name}
        </p>

        {/* Name */}
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#00002E] transition-colors">
          {part.name}
        </h3>

        {/* Car Info */}
        {part.car && (
          <p className="text-xs text-gray-500 mb-3">
            {part.car.make} {part.car.model} ({part.car.year})
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">(4.0)</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-[#00002E]">
            Rs. {(part.discountPrice || part.price).toLocaleString()}
          </span>
          {part.discountPrice && (
            <span className="text-sm text-gray-400 line-through">
              Rs. {part.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-medium ${
            part.stock > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {part.stock > 0 ? `${part.stock} in stock` : 'Out of stock'}
          </span>
          
          {/* Quick Add Button */}
          <button
            onClick={handleAddToCart}
            disabled={part.stock <= 0}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              part.stock > 0
                ? 'bg-[#00002E] text-white hover:bg-[#000050]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
