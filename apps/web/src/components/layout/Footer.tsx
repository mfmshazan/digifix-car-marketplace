import Link from 'next/link';
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Digi<span className="text-primary-500">Fix</span>
              </span>
            </Link>
            <p className="text-gray-600 text-sm">
              Your trusted marketplace for premium car parts. Find the perfect parts for your vehicle with our number plate search system.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-600 hover:text-primary-500 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-500 transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-500 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-500 transition-colors" aria-label="Youtube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/parts" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Browse Parts
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/deals" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Special Deals
                </Link>
              </li>
              <li>
                <Link href="/sellers" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Become a Seller
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-primary-500 transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4 text-primary-500" />
                123 Auto Street, Colombo, Sri Lanka
              </li>
              <li className="flex items-center gap-2 text-gray-600 text-sm">
                <Phone className="w-4 h-4 text-primary-500" />
                +94 11 234 5678
              </li>
              <li className="flex items-center gap-2 text-gray-600 text-sm">
                <Mail className="w-4 h-4 text-primary-500" />
                support@digifix.com
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} DigiFix Car Marketplace. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-gray-500 hover:text-primary-500 transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-primary-500 transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
