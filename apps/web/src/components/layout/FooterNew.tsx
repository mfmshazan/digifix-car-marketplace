'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function FooterNew() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Contact */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-white">
                Digi<span className="text-orange-500">Fix</span>
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-orange-500 font-bold">+94 11 234 5678</p>
                <p className="text-xs text-gray-400">Call out Hotline 24/7</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              57 heol isaf Station Road, Cardiff, Sri Lanka
            </p>
            <p className="text-sm text-gray-400 mb-6">
              info@digifix.com
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-orange-500 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-orange-500 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-orange-500 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-orange-500 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-6">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">About Us</Link></li>
              <li><Link href="/parts" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Shop</Link></li>
              <li><Link href="/cart" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Cart</Link></li>
              <li><Link href="/categories" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Brands</Link></li>
              <li><Link href="/mobile" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Mobile App</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-6">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/reviews" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Reviews</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Contact</Link></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Return Policy</Link></li>
              <li><Link href="/support" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Online Support</Link></li>
              <li><Link href="/money-back" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Money Back</Link></li>
            </ul>
          </div>

          {/* Store Info */}
          <div>
            <h3 className="text-white font-semibold mb-6">Store Info</h3>
            <ul className="space-y-3">
              <li><Link href="/parts?sort=bestseller" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Best Seller</Link></li>
              <li><Link href="/parts?sort=topsold" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Top Sold Items</Link></li>
              <li><Link href="/parts?sort=newest" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">New Arrivals</Link></li>
              <li><Link href="/parts?filter=sale" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Flash Sale</Link></li>
              <li><Link href="/parts?filter=discount" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Discount Products</Link></li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h3 className="text-white font-semibold mb-6">Subscribe</h3>
            <p className="text-gray-400 text-sm mb-4">
              Stay informed about upcoming events, webinars, and exciting happenings.
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Email Address"
                className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-l-lg text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-r-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              Copyright © {currentYear} <span className="text-orange-500">DigiFix</span>, Inc. All Rights Reserved
            </p>
            <div className="flex items-center gap-2">
              {/* Payment Method Icons */}
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">AMEX</span>
              </div>
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-800">VISA</span>
              </div>
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">PayPal</span>
              </div>
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-orange-500">MC</span>
              </div>
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">Discover</span>
              </div>
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">GPay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
