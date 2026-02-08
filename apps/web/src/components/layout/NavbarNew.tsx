'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart, User, Search, ChevronDown, LogOut, LayoutDashboard, Heart, Phone } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { categoriesApi } from '@/lib/api';

interface Category {
  id: string;
  name: string;
}

export default function NavbarNew() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Select Category');
  
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/parts', label: 'Shop', hasDropdown: true },
    { href: '/categories', label: 'Categories' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  const dashboardLink = user?.role === 'SALESMAN' ? '/dashboard/salesman' : '/dashboard/customer';

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/parts?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gray-900 text-white py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <span>Welcome to DigiFix Car Parts Marketplace</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span>🌐 EN</span>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Call out Hotline 24/7</span>
            </div>
            <span className="font-bold text-orange-500">+94 11 234 5678</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Digi<span className="text-orange-500">Fix</span>
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="flex w-full rounded-lg overflow-hidden border border-gray-200">
                {/* Category Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 text-sm font-medium border-r border-gray-200 hover:bg-gray-100 transition-colors min-w-[160px]"
                  >
                    <span className="truncate">{selectedCategory}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </button>
                  {showCategoryMenu && (
                    <div className="absolute top-full left-0 w-48 bg-white rounded-b-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('All Categories');
                          setShowCategoryMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        All Categories
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            setShowCategoryMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Search Input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Products"
                  className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                />
                {/* Search Button */}
                <button
                  type="submit"
                  className="px-6 bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Wishlist */}
              <button className="hidden md:flex items-center justify-center w-10 h-10 text-gray-600 hover:text-orange-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>

              {/* Cart */}
              <Link href="/cart" className="relative flex items-center justify-center w-10 h-10 text-gray-600 hover:text-orange-500 transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-xs font-semibold flex items-center justify-center text-white">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden md:block text-sm font-medium">{user?.name || 'User'}</span>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                      <Link
                        href={dashboardLink}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:block text-sm font-medium">Sign In</span>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Navigation */}
        <div className="hidden md:block border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">
              {/* All Categories Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                <Menu className="w-4 h-4" />
                All Categories
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Nav Links */}
              <div className="flex items-center gap-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1 text-gray-700 hover:text-orange-500 transition-colors text-sm font-medium"
                  >
                    {link.label}
                    {link.hasDropdown && <ChevronDown className="w-4 h-4" />}
                  </Link>
                ))}
              </div>

              {/* Currency */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>LKR ▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="p-4 border-b border-gray-100">
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Products"
                  className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                />
                <button
                  type="submit"
                  className="px-4 bg-orange-500 text-white"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>
            {/* Mobile Nav Links */}
            <div className="py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
