import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

const categories = [
  { name: 'Brakes', description: 'Brake pads, rotors, calipers, and brake fluid', icon: '🛑' },
  { name: 'Engine Parts', description: 'Engine components and accessories', icon: '⚙️' },
  { name: 'Filters', description: 'Oil filters, air filters, fuel filters', icon: '🔧' },
  { name: 'Lighting', description: 'Headlights, taillights, bulbs', icon: '💡' },
  { name: 'Suspension', description: 'Shocks, struts, springs', icon: '🚗' },
  { name: 'Electrical', description: 'Batteries, alternators, starters', icon: '🔋' },
  { name: 'Tires & Wheels', description: 'Tires, rims, wheel accessories', icon: '🛞' },
  { name: 'Fluids & Chemicals', description: 'Motor oil, coolant, lubricants', icon: '🛢️' },
  { name: 'Exhaust', description: 'Mufflers, catalytic converters, pipes', icon: '💨' },
  { name: 'Interior', description: 'Seats, floor mats, steering wheels', icon: '🪑' },
];

// Mock cars with Sri Lankan number plates
const cars = [
  {
    numberPlate: 'CAB-1234',
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    engineType: '1.8L Petrol',
    color: 'White',
    description: 'Toyota Corolla 2020 model, well maintained',
    images: [
      'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800',
      'https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800',
    ],
  },
  {
    numberPlate: 'WP-KA-5678',
    make: 'Honda',
    model: 'Civic',
    year: 2019,
    engineType: '1.5L Turbo Petrol',
    color: 'Black',
    description: 'Honda Civic 2019 turbo model',
    images: [
      'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=800',
      'https://images.unsplash.com/photo-1590510696023-3ad8f78c9f4e?w=800',
    ],
  },
  {
    numberPlate: 'CAA-9012',
    make: 'Nissan',
    model: 'Sunny',
    year: 2018,
    engineType: '1.5L Petrol',
    color: 'Silver',
    description: 'Nissan Sunny 2018 model',
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800',
    ],
  },
  {
    numberPlate: 'WP-CAD-3456',
    make: 'Toyota',
    model: 'Prius',
    year: 2021,
    engineType: '1.8L Hybrid',
    color: 'Blue',
    description: 'Toyota Prius Hybrid 2021',
    images: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
    ],
  },
  {
    numberPlate: 'CAC-7890',
    make: 'Suzuki',
    model: 'Swift',
    year: 2022,
    engineType: '1.2L Petrol',
    color: 'Red',
    description: 'Suzuki Swift 2022 model',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    ],
  },
];

// Mock car parts with images
const getCarParts = (carId, categoryMap, sellerId) => [
  // Brake parts
  {
    name: 'Front Brake Pad Set',
    description: 'High-quality ceramic front brake pads. Provides excellent stopping power and low dust.',
    partNumber: 'BRK-FP-001',
    price: 8500,
    discountPrice: 7500,
    stock: 15,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
    ],
    carId,
    categoryId: categoryMap['Brakes'],
    sellerId,
  },
  {
    name: 'Rear Brake Disc Rotor',
    description: 'OEM quality rear brake disc rotor. Direct fit replacement.',
    partNumber: 'BRK-RD-002',
    price: 12000,
    stock: 8,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    ],
    carId,
    categoryId: categoryMap['Brakes'],
    sellerId,
  },
  // Engine parts
  {
    name: 'Spark Plug Set (4 pcs)',
    description: 'Iridium spark plugs for better fuel efficiency and performance.',
    partNumber: 'ENG-SP-001',
    price: 4500,
    discountPrice: 3800,
    stock: 25,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    ],
    carId,
    categoryId: categoryMap['Engine Parts'],
    sellerId,
  },
  {
    name: 'Timing Belt Kit',
    description: 'Complete timing belt kit including tensioner and idler pulleys.',
    partNumber: 'ENG-TB-002',
    price: 18500,
    stock: 5,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
    ],
    carId,
    categoryId: categoryMap['Engine Parts'],
    sellerId,
  },
  // Filters
  {
    name: 'Engine Oil Filter',
    description: 'Premium oil filter for maximum engine protection.',
    partNumber: 'FLT-OL-001',
    price: 1200,
    discountPrice: 950,
    stock: 50,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800',
    ],
    carId,
    categoryId: categoryMap['Filters'],
    sellerId,
  },
  {
    name: 'Air Filter',
    description: 'High-flow air filter for improved engine breathing.',
    partNumber: 'FLT-AR-002',
    price: 2500,
    stock: 30,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    ],
    carId,
    categoryId: categoryMap['Filters'],
    sellerId,
  },
  // Lighting
  {
    name: 'LED Headlight Bulbs (Pair)',
    description: 'Super bright LED headlight bulbs. 6000K white light.',
    partNumber: 'LGT-HL-001',
    price: 6500,
    discountPrice: 5500,
    stock: 20,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800',
    ],
    carId,
    categoryId: categoryMap['Lighting'],
    sellerId,
  },
  // Suspension
  {
    name: 'Front Shock Absorber',
    description: 'Gas-filled front shock absorber for smooth ride.',
    partNumber: 'SUS-FS-001',
    price: 15000,
    stock: 10,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    ],
    carId,
    categoryId: categoryMap['Suspension'],
    sellerId,
  },
  // Electrical
  {
    name: 'Car Battery 12V 60Ah',
    description: 'Maintenance-free car battery with 2-year warranty.',
    partNumber: 'ELC-BT-001',
    price: 22000,
    discountPrice: 19500,
    stock: 12,
    condition: 'NEW',
    images: [
      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    ],
    carId,
    categoryId: categoryMap['Electrical'],
    sellerId,
  },
  // Used parts
  {
    name: 'Used Side Mirror (Left)',
    description: 'Original side mirror in good condition. Minor scratches.',
    partNumber: 'USD-SM-001',
    price: 8000,
    stock: 2,
    condition: 'USED',
    images: [
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800',
    ],
    carId,
    categoryId: categoryMap['Interior'],
    sellerId,
  },
];

async function seed() {
  console.log('🌱 Starting seed...\n');

  // Create categories
  console.log('Creating categories...');
  const categoryMap = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    categoryMap[created.name] = created.id;
    console.log(`  ✅ ${created.name}`);
  }

  // Create a test salesman user
  console.log('\nCreating test salesman user...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  const salesman = await prisma.user.upsert({
    where: { email: 'salesman@test.com' },
    update: {
      password: hashedPassword,
      name: 'Test Shop Owner',
      role: 'SALESMAN',
      isVerified: true,
    },
    create: {
      email: 'salesman@test.com',
      password: hashedPassword,
      name: 'Test Shop Owner',
      phone: '+94771234567',
      role: 'SALESMAN',
      isVerified: true,
    },
  });
  console.log(`  ✅ Salesman: ${salesman.email}`);

  // Create a test customer user
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {
      password: hashedPassword,
      name: 'Test Customer',
      role: 'CUSTOMER',
      isVerified: true,
    },
    create: {
      email: 'customer@test.com',
      password: hashedPassword,
      name: 'Test Customer',
      phone: '+94779876543',
      role: 'CUSTOMER',
      isVerified: true,
    },
  });
  console.log(`  ✅ Customer: ${customer.email}`);

  // Create cars
  console.log('\nCreating cars...');
  const createdCars = [];
  for (const car of cars) {
    const created = await prisma.car.upsert({
      where: { numberPlate: car.numberPlate },
      update: {},
      create: car,
    });
    createdCars.push(created);
    console.log(`  ✅ ${created.numberPlate} - ${created.make} ${created.model} (${created.year})`);
  }

  // Create car parts for each car
  console.log('\nCreating car parts...');
  let totalParts = 0;
  for (const car of createdCars) {
    const parts = getCarParts(car.id, categoryMap, salesman.id);
    for (const part of parts) {
      // Check if part already exists
      const existing = await prisma.carPart.findFirst({
        where: {
          partNumber: part.partNumber,
          carId: car.id,
        },
      });
      
      if (!existing) {
        await prisma.carPart.create({
          data: part,
        });
        totalParts++;
      }
    }
    console.log(`  ✅ Added parts for ${car.numberPlate}`);
  }

  console.log(`\n✨ Seed completed!`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${createdCars.length} cars`);
  console.log(`   - ${totalParts} car parts`);
  console.log(`   - 2 test users (salesman@test.com, customer@test.com)`);

  // Create mock orders for salesman to see
  console.log('\nCreating mock orders...');
  
  // Get first 3 car parts for the orders
  const sampleParts = await prisma.carPart.findMany({
    take: 5,
    where: { sellerId: salesman.id },
    include: {
      car: true,
      category: true,
    },
  });

  if (sampleParts.length > 0) {
    // Use fixed dates for mock orders so they don't change on re-seed
    const today = new Date('2026-02-18T10:00:00Z');
    const oneDayAgo = new Date('2026-02-17T10:00:00Z');
    const twoDaysAgo = new Date('2026-02-16T10:00:00Z');
    const fiveDaysAgo = new Date('2026-02-13T10:00:00Z');

    // Check if mock orders already exist
    const existingMockOrders = await prisma.order.findMany({
      where: {
        orderNumber: {
          in: ['ORD-MOCK-001', 'ORD-MOCK-002', 'ORD-MOCK-003', 'ORD-MOCK-004']
        }
      }
    });

    // Only create mock orders if they don't exist
    if (existingMockOrders.length > 0) {
      console.log(`  ℹ️  Mock orders already exist, skipping creation`);
    } else {
      // Create mock orders
      const mockOrders = [
        {
          orderNumber: 'ORD-MOCK-001',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'CASH_ON_DELIVERY',
          parts: [sampleParts[0], sampleParts[1]].filter(Boolean),
          createdAt: today,
        },
        {
          orderNumber: 'ORD-MOCK-002',
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
          parts: [sampleParts[2]].filter(Boolean),
          createdAt: oneDayAgo,
        },
        {
          orderNumber: 'ORD-MOCK-003',
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
          parts: [sampleParts[3], sampleParts[4]].filter(Boolean),
          createdAt: twoDaysAgo,
        },
        {
          orderNumber: 'ORD-MOCK-004',
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          paymentMethod: 'CASH_ON_DELIVERY',
          parts: [sampleParts[0]].filter(Boolean),
          createdAt: fiveDaysAgo,
        },
      ];

      for (const mockOrder of mockOrders) {
        if (mockOrder.parts.length === 0) continue;

        const subtotal = mockOrder.parts.reduce((sum, part) => {
          const price = part.discountPrice || part.price;
          return sum + price * 2; // quantity of 2 for each
        }, 0);
        const deliveryFee = 300;
        const total = subtotal + deliveryFee;

        const order = await prisma.order.create({
          data: {
            orderNumber: mockOrder.orderNumber,
            customerId: customer.id,
            salesmanId: salesman.id,
            status: mockOrder.status,
            paymentStatus: mockOrder.paymentStatus,
            paymentMethod: mockOrder.paymentMethod,
            subtotal,
            deliveryFee,
            total,
            createdAt: mockOrder.createdAt,
            items: {
              create: mockOrder.parts.map(part => ({
                carPartId: part.id,
                itemType: 'CAR_PART',
                itemName: part.name,
                quantity: 2,
                price: part.discountPrice || part.price,
                total: (part.discountPrice || part.price) * 2,
              })),
            },
          },
        });

        // Create tracking entry
        await prisma.orderTracking.create({
          data: {
            orderId: order.id,
            status: mockOrder.status,
            description: `Order ${mockOrder.status.toLowerCase()}`,
          },
        });

        console.log(`  ✅ Created order ${order.orderNumber} (${mockOrder.status})`);
      }
      console.log(`\n   - Mock orders created for salesman dashboard`);
    }
  }
  
  // List cars with number plates
  console.log('\n📋 Cars available for testing:');
  console.log('--------------------------------');
  for (const car of createdCars) {
    const partsCount = await prisma.carPart.count({ where: { carId: car.id } });
    console.log(`Number Plate: ${car.numberPlate}`);
    console.log(`Vehicle: ${car.make} ${car.model} (${car.year})`);
    console.log(`Parts available: ${partsCount}`);
    console.log('');
  }

  console.log('\n🔑 Test credentials:');
  console.log('--------------------');
  console.log('Salesman: salesman@test.com / password123');
  console.log('Customer: customer@test.com / password123');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
