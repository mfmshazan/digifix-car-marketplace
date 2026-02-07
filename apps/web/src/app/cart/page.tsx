'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Check, ArrowRight } from 'lucide-react';
import { useCartStore, CartItem } from '@/store/cartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCartStore();
  const [promoCode, setPromoCode] = useState('');

  const subtotal = getTotalPrice();
  const delivery = subtotal > 5000 ? 0 : 350;
  const total = subtotal + delivery;

  if (items.length === 0) {
    return (
      <div className="pt-20 pb-16 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Looks like you haven't added any parts to your cart yet.
          </p>
          <Link href="/parts" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Browse Parts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Shopping Cart</h1>
          <p className="text-gray-600">{items.length} items in your cart</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
              />
            ))}

            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-2 mt-4"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="text-gray-900 font-medium">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className={delivery === 0 ? 'text-green-600 font-medium' : 'text-gray-900'}>
                    {delivery === 0 ? 'FREE' : `Rs. ${delivery}`}
                  </span>
                </div>
                {subtotal < 5000 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm text-blue-700">
                      Add Rs. {(5000 - subtotal).toLocaleString()} more for free shipping!
                    </p>
                  </div>
                )}
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2">Promo Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium">
                    Apply
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-primary-600">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <button className="btn-primary w-full mb-4 flex items-center justify-center gap-2">
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>

              <Link
                href="/parts"
                className="block text-center text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({
  item,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
}) {
  const price = item.discountPrice || item.price;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-4">
        {/* Image */}
        <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-semibold mb-1 truncate">{item.name}</h3>
          <p className="text-gray-500 text-sm mb-3">{item.carInfo}</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-primary-600 font-bold text-lg">
                Rs. {(price * item.quantity).toLocaleString()}
              </span>
              {item.quantity > 1 && (
                <span className="text-gray-500 text-sm ml-2">
                  (Rs. {price.toLocaleString()} each)
                </span>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.quantity - 1)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-gray-900 font-medium">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.quantity + 1)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center text-red-500 transition-colors ml-2"
                aria-label="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
