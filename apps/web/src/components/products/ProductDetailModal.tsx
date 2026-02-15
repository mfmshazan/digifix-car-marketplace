'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ShoppingCart, Heart, Share2, Star, Check, Package, Truck, Shield } from 'lucide-react';
import { CarPart } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface ProductDetailModalProps {
  part: CarPart | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ part, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedImageIndex(0);
      setQuantity(1);
      setAddedToCart(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !part) return null;

  const images = part.images && part.images.length > 0 ? part.images : [];
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    // Add to local cart store
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: part.id,
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: `${part.car.make} ${part.car.model} (${part.car.year})`,
      });
    }
    
    // Reset quantity after single add since we're using increment
    setIsAddingToCart(false);
    setAddedToCart(true);
    setQuantity(1);
    
    setTimeout(() => setAddedToCart(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative bg-gray-50 p-6">
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImageIndex]}
                  alt={part.name}
                  fill
                  className="object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <div className="w-32 h-32 text-primary-500/30">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                      <circle cx="7.5" cy="14.5" r="1.5"/>
                      <circle cx="16.5" cy="14.5" r="1.5"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Navigation Arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {hasMultipleImages && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {hasMultipleImages && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${part.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 md:p-8 overflow-y-auto max-h-[90vh] md:max-h-none">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${conditionColors[part.condition]}`}>
                {part.condition}
              </span>
              {part.stock > 0 ? (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  In Stock ({part.stock})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {part.name}
            </h2>

            {/* Car Info */}
            <p className="text-gray-500 mb-4">
              For {part.car.make} {part.car.model} ({part.car.year}) - {part.car.numberPlate}
            </p>

            {/* Category */}
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm">
                {part.category.name}
              </span>
            </div>

            {/* Price */}
            <div className="mb-6">
              {part.discountPrice ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary-600">
                    Rs. {part.discountPrice.toLocaleString()}
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    Rs. {part.price.toLocaleString()}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-sm font-semibold">
                    {discount}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-primary-600">
                  Rs. {part.price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            {part.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{part.description}</p>
              </div>
            )}

            {/* Seller Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sold by</h3>
              <p className="text-gray-900 font-medium">{part.seller.name}</p>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Quantity</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(part.stock, quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                  disabled={quantity >= part.stock}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={part.stock === 0 || isAddingToCart}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : part.stock === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                }`}
              >
                {isAddingToCart ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </>
                )}
              </button>
              <button aria-label="Add to wishlist" className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600 hover:text-red-500 hover:border-red-300 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button aria-label="Share product" className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600 hover:text-primary-500 hover:border-primary-300 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-xs text-gray-600">Quality Parts</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                  <Truck className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-xs text-gray-600">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-xs text-gray-600">Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
