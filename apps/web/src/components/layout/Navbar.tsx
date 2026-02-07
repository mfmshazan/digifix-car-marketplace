'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart, User, Search, Car } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/parts', label: 'Car Parts' },
    { href: '/categories', label: 'Categories' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Digi<span className="text-primary-500">Fix</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              className="p-2 text-gray-600 hover:text-primary-500 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-primary-500 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full text-xs font-semibold flex items-center justify-center text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href="/login" className="btn-secondary text-sm py-2 px-4">
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <Link href="/cart" className="flex items-center gap-2 text-gray-600 hover:text-primary-500">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cartCount})
                </Link>
                <Link href="/login" className="btn-primary text-sm py-2 px-4">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
