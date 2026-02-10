'use client';

import Link from 'next/link';

// Vehicle type categories with SVG icons
const vehicleTypes = [
  {
    id: 'cars',
    name: 'Cars',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        <path d="M56,28H52l-4-12a4,4,0,0,0-3.8-2.8H19.8A4,4,0,0,0,16,16L12,28H8a2,2,0,0,0-2,2v8a2,2,0,0,0,2,2h2v10a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2V40H46v10a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2V40h2a2,2,0,0,0,2-2V30A2,2,0,0,0,56,28ZM19.8,17.2H44.2L47.5,28H16.5ZM56,38H8V30H56ZM16,50H12V40h4Zm36,0H48V40h4Z" opacity="0.4"/>
        <circle cx="16" cy="34" r="3"/>
        <circle cx="48" cy="34" r="3"/>
      </svg>
    ),
    count: '2,500+ Parts',
    href: '/parts?type=car',
  },
  {
    id: 'motorcycles',
    name: 'Motorcycles',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        <path d="M56,32a10,10,0,0,0-9.5,7H38l-4-8h6a2,2,0,0,0,0-4H32a2,2,0,0,0-1.78,1.1L26.9,35H16.5a10,10,0,1,0,0,4H27a2,2,0,0,0,1.78-1.1L32.1,31H34l4,8H46.5A10,10,0,1,0,56,32ZM8,42a6,6,0,1,1,6-6A6,6,0,0,1,8,42Zm48,0a6,6,0,1,1,6-6A6,6,0,0,1,56,42Z" opacity="0.4"/>
        <circle cx="8" cy="36" r="3"/>
        <circle cx="56" cy="36" r="3"/>
      </svg>
    ),
    count: '1,200+ Parts',
    href: '/parts?type=motorcycle',
  },
  {
    id: 'snowmobiles',
    name: 'Snow Mobiles',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        <path d="M58,40H52V32a4,4,0,0,0-4-4H32l-6-8H14a4,4,0,0,0-4,4V40H6a2,2,0,0,0,0,4H58a2,2,0,0,0,0-4ZM14,24H24l4.5,6H14Zm34,16H14V34H48Z" opacity="0.4"/>
        <rect x="18" y="36" width="8" height="2" rx="1"/>
        <rect x="30" y="36" width="8" height="2" rx="1"/>
        <rect x="42" y="36" width="4" height="2" rx="1"/>
        <path d="M8,48H56a2,2,0,0,1,0,4H8a2,2,0,0,1,0-4Z"/>
      </svg>
    ),
    count: '450+ Parts',
    href: '/parts?type=snowmobile',
  },
  {
    id: 'atvs',
    name: 'ATVs',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        <path d="M52,28H46l-2-4a4,4,0,0,0-3.6-2.2H23.6A4,4,0,0,0,20,24l-2,4H12a4,4,0,0,0-4,4v8a4,4,0,0,0,4,4H52a4,4,0,0,0,4-4V32A4,4,0,0,0,52,28ZM23.6,25.8H40.4l1.5,3H22.1Z" opacity="0.4"/>
        <circle cx="14" cy="46" r="6"/>
        <circle cx="50" cy="46" r="6"/>
        <rect x="28" y="34" width="8" height="4" rx="1"/>
      </svg>
    ),
    count: '680+ Parts',
    href: '/parts?type=atv',
  },
  {
    id: 'scooters',
    name: 'Scooters',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        <path d="M48,28H40V24a4,4,0,0,0-4-4H24a4,4,0,0,0-4,4v4H16a4,4,0,0,0-4,4v8a4,4,0,0,0,4,4h4v2a6,6,0,0,0,12,0V44H32v2a6,6,0,0,0,12,0V44h4a4,4,0,0,0,4-4V32A4,4,0,0,0,48,28ZM24,24H36v4H24ZM26,46a2,2,0,0,1-4,0V44h4Zm14,0a2,2,0,0,1-4,0V44h4Z" opacity="0.4"/>
        <circle cx="12" cy="48" r="4"/>
        <circle cx="52" cy="48" r="4"/>
      </svg>
    ),
    count: '320+ Parts',
    href: '/parts?type=scooter',
  },
];

export default function VehicleTypesSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#00002E] mb-4">
            Shop by Vehicle Type
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Find the perfect parts for your vehicle. Browse our extensive catalog organized by vehicle type.
          </p>
        </div>

        {/* Vehicle Type Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {vehicleTypes.map((type) => (
            <Link
              key={type.id}
              href={type.href}
              className="group relative bg-white border-2 border-gray-100 rounded-2xl p-6 text-center transition-all duration-300 hover:border-[#00002E] hover:shadow-xl hover:-translate-y-1"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4 text-gray-400 group-hover:text-[#00002E] transition-colors duration-300">
                {type.icon}
              </div>
              
              {/* Name */}
              <h3 className="text-lg font-bold text-[#00002E] mb-1">
                {type.name}
              </h3>
              
              {/* Count */}
              <p className="text-sm text-gray-500">
                {type.count}
              </p>

              {/* Hover Arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="w-5 h-5 text-[#00002E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
