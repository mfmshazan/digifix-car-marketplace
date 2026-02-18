'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, ArrowRight } from 'lucide-react';

export default function FooterModern() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    shop: [
      { label: 'All Parts', href: '/parts' },
      { label: 'New Arrivals', href: '/parts?sort=newest' },
      { label: 'Best Sellers', href: '/parts?sort=popular' },
      { label: 'Deals & Offers', href: '/parts?discount=true' },
      { label: 'Categories', href: '/categories' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Track Order', href: '/track' },
      { label: 'Contact Us', href: '/contact' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Press', href: '/press' },
      { label: 'Partners', href: '/partners' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  };

  return (
    <footer className="bg-[#00002E] text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2">
                Subscribe to Our Newsletter
              </h3>
              <p className="text-gray-400">
                Get the latest updates on new parts, deals, and automotive tips.
              </p>
            </div>
            <div>
              <form className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-[#00002E] font-semibold rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  Subscribe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-[#00002E]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
              </div>
              <span className="text-2xl font-black">
                <span className="text-gray-500"></span>
                <span className="text-white">Digi</span>
                <span className="text-gray-500">Fix</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Your trusted marketplace for quality car parts. Connect with verified sellers and find the perfect parts for your vehicle.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="tel:+94112345678" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+94 11 234 5678</span>
              </a>
              <a href="mailto:info@digifix.lk" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
                <span className="text-sm">info@digifix.lk</span>
              </a>
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Colombo, Sri Lanka</span>
              </div>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Shop</h4>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} DIGIFIX Car Parts. All rights reserved.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm mr-2">We Accept:</span>
              <div className="flex gap-2">
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold">VISA</span>
                </div>
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold">MC</span>
                </div>
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold">AMEX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
