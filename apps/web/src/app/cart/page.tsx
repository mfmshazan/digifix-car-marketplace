'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import { useCartStore, CartItem } from '@/store/cartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCartStore();
  const [promoCode, setPromoCode] = useState('');

  const subtotal = getTotalPrice();
  const delivery = subtotal > 5000 ? 0 : 350;
  const total = subtotal + delivery;

  if (items.length === 0) {
    return (
      <div className="pt-20 pb-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-dark-800 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-dark-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-dark-400 mb-8">
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
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Shopping Cart</h1>

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
              className="text-primary-500 hover:text-primary-400 text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-dark-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-dark-400">
                  <span>Delivery</span>
                  <span className={delivery === 0 ? 'text-green-500' : 'text-white'}>
                    {delivery === 0 ? 'FREE' : `Rs. ${delivery}`}
                  </span>
                </div>
                {subtotal < 5000 && (
                  <p className="text-xs text-dark-500">
                    Add Rs. {(5000 - subtotal).toLocaleString()} more for free shipping
                  </p>
                )}
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm text-dark-400 mb-2">Promo Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="input-field flex-1"
                  />
                  <button className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors">
                    Apply
                  </button>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-primary-500">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <button className="btn-primary w-full mb-4">
                Proceed to Checkout
              </button>

              <Link
                href="/parts"
                className="block text-center text-dark-400 hover:text-white text-sm transition-colors"
              >
                Continue Shopping
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
    <div className="card p-4">
      <div className="flex gap-4">
        {/* Image */}
        <div className="w-24 h-24 bg-dark-800 rounded-xl flex-shrink-0 overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-500/30">
              <ShoppingBag className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1 truncate">{item.name}</h3>
          <p className="text-dark-400 text-sm mb-2">{item.carInfo}</p>
          <div className="flex items-center justify-between">
            <span className="text-primary-500 font-bold">
              Rs. {(price * item.quantity).toLocaleString()}
            </span>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.quantity - 1)}
                className="w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center text-white transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-white font-medium">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.quantity + 1)}
                className="w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center text-white transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                className="w-8 h-8 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-500 transition-colors ml-2"
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
