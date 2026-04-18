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

// Car parts for Shop A (Brakes, Engine, Filters, Lighting, Exhaust, Tires)
const getShopACarParts = (carId, categoryMap, sellerId) => [
  {
    name: 'Front Brake Pad Set',
    description: 'High-quality ceramic front brake pads from Shop A. Provides excellent stopping power.',
    partNumber: 'A-BRK-FP-001',
    price: 8500,
    discountPrice: 7500,
    stock: 15,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    carId,
    categoryId: categoryMap['Brakes'],
    sellerId,
  },
  {
    name: 'Rear Brake Disc Rotor',
    description: 'OEM quality rear brake disc rotor from Shop A.',
    partNumber: 'A-BRK-RD-002',
    price: 12000,
    stock: 8,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    carId,
    categoryId: categoryMap['Brakes'],
    sellerId,
  },
  {
    name: 'Spark Plug Set (4 pcs)',
    description: 'Iridium spark plugs from Shop A for better fuel efficiency.',
    partNumber: 'A-ENG-SP-001',
    price: 4500,
    discountPrice: 3800,
    stock: 25,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'],
    carId,
    categoryId: categoryMap['Engine Parts'],
    sellerId,
  },
  {
    name: 'Engine Oil Filter',
    description: 'Premium oil filter from Shop A for maximum engine protection.',
    partNumber: 'A-FLT-OL-001',
    price: 1200,
    discountPrice: 950,
    stock: 50,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800'],
    carId,
    categoryId: categoryMap['Filters'],
    sellerId,
  },
  {
    name: 'Air Filter',
    description: 'High-flow air filter from Shop A for improved engine performance.',
    partNumber: 'A-FLT-AIR-002',
    price: 2500,
    discountPrice: 2100,
    stock: 30,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800'],
    carId,
    categoryId: categoryMap['Filters'],
    sellerId,
  },
  {
    name: 'LED Headlight Bulbs (Pair)',
    description: 'Super bright LED headlight bulbs from Shop A. 6000K white light.',
    partNumber: 'A-LGT-HL-001',
    price: 6500,
    discountPrice: 5500,
    stock: 20,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800'],
    carId,
    categoryId: categoryMap['Lighting'],
    sellerId,
  },
  {
    name: 'Exhaust Muffler',
    description: 'Stainless steel exhaust muffler from Shop A. Reduces noise and improves performance.',
    partNumber: 'A-EXH-MF-001',
    price: 18000,
    discountPrice: 15500,
    stock: 10,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'],
    carId,
    categoryId: categoryMap['Exhaust'],
    sellerId,
  },
  {
    name: 'All-Season Tire (1 pc)',
    description: 'Premium all-season tire from Shop A with excellent grip.',
    partNumber: 'A-TIR-AS-001',
    price: 12500,
    discountPrice: 11000,
    stock: 16,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    carId,
    categoryId: categoryMap['Tires & Wheels'],
    sellerId,
  },
];

// Car parts for Shop B (Suspension, Electrical, Interior)
const getShopBCarParts = (carId, categoryMap, sellerId) => [
  {
    name: 'Front Shock Absorber',
    description: 'Gas-filled front shock absorber from Shop B for smooth ride.',
    partNumber: 'B-SUS-FS-001',
    price: 15000,
    stock: 10,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    carId,
    categoryId: categoryMap['Suspension'],
    sellerId,
  },
  {
    name: 'Rear Coil Spring Set',
    description: 'Heavy-duty rear coil springs from Shop B.',
    partNumber: 'B-SUS-CS-002',
    price: 18000,
    discountPrice: 16000,
    stock: 6,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    carId,
    categoryId: categoryMap['Suspension'],
    sellerId,
  },
  {
    name: 'Car Battery 12V 60Ah',
    description: 'Maintenance-free car battery from Shop B with 2-year warranty.',
    partNumber: 'B-ELC-BT-001',
    price: 22000,
    discountPrice: 19500,
    stock: 12,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'],
    carId,
    categoryId: categoryMap['Electrical'],
    sellerId,
  },
  {
    name: 'Alternator',
    description: 'High-output alternator from Shop B.',
    partNumber: 'B-ELC-AL-002',
    price: 35000,
    stock: 5,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'],
    carId,
    categoryId: categoryMap['Electrical'],
    sellerId,
  },
  {
    name: 'Car Floor Mats Set',
    description: 'Premium rubber floor mats from Shop B.',
    partNumber: 'B-INT-FM-001',
    price: 4500,
    discountPrice: 3800,
    stock: 15,
    condition: 'NEW',
    images: ['https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800'],
    carId,
    categoryId: categoryMap['Interior'],
    sellerId,
  },
];

async function seed() {
  console.log('🌱 Starting seed...\n');

  // Clear existing data for fresh seed
  console.log('Clearing existing data...');
  await prisma.orderTracking.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.carPart.deleteMany({});
  await prisma.car.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('  ✅ Data cleared\n');

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

  // Create test users
  console.log('\nCreating test users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // SHOP A - Salesman 1 (Brakes, Engine, Filters, Lighting)
  const salesmanA = await prisma.user.upsert({
    where: { email: 'shopa@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'Shop A',
      role: 'SALESMAN',
      isVerified: true,
    },
    create: {
      email: 'shopa@gmail.com',
      password: hashedPassword,
      name: 'Shop A',
      phone: '+94771111111',
      role: 'SALESMAN',
      isVerified: true,
    },
  });
  console.log(`  ✅ Shop A Salesman: ${salesmanA.email}`);

  // SHOP B - Salesman 2 (Suspension, Electrical, Interior)
  const salesmanB = await prisma.user.upsert({
    where: { email: 'shopb@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'Shop B',
      role: 'SALESMAN',
      isVerified: true,
    },
    create: {
      email: 'shopb@gmail.com',
      password: hashedPassword,
      name: 'Shop B',
      phone: '+94772222222',
      role: 'SALESMAN',
      isVerified: true,
    },
  });
  console.log(`  ✅ Shop B Salesman: ${salesmanB.email}`);

  // Create a test customer user
  const customer = await prisma.user.upsert({
    where: { email: 'customer@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'Test Customer',
      role: 'CUSTOMER',
      isVerified: true,
    },
    create: {
      email: 'customer@gmail.com',
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

  // Create car parts for SHOP A
  console.log('\nCreating car parts for Shop A...');
  let shopAPartsCount = 0;
  const shopAParts = [];
  for (const car of createdCars) { // All cars get Shop A parts
    const parts = getShopACarParts(car.id, categoryMap, salesmanA.id);
    for (const part of parts) {
      const created = await prisma.carPart.create({ data: part });
      shopAParts.push(created);
      shopAPartsCount++;
    }
  }
  console.log(`  ✅ Shop A: ${shopAPartsCount} parts created`);

  // Create car parts for SHOP B
  console.log('\nCreating car parts for Shop B...');
  let shopBPartsCount = 0;
  const shopBParts = [];
  for (const car of createdCars.slice(2, 5)) { // Cars 3-5 for Shop B (overlaps with Shop A on car 3)
    const parts = getShopBCarParts(car.id, categoryMap, salesmanB.id);
    for (const part of parts) {
      const created = await prisma.carPart.create({ data: part });
      shopBParts.push(created);
      shopBPartsCount++;
    }
  }
  console.log(`  ✅ Shop B: ${shopBPartsCount} parts created`);

  // Create mock orders
  console.log('\nCreating mock orders...');
  const today = new Date();
  const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

  // ORDER 1: Only from Shop A (visible only to Shop A salesman)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SHOPA-001',
      customerId: customer.id,
      salesmanId: salesmanA.id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      subtotal: (shopAParts[0].discountPrice || shopAParts[0].price) * 2,
      deliveryFee: 300,
      total: (shopAParts[0].discountPrice || shopAParts[0].price) * 2 + 300,
      createdAt: today,
      items: {
        create: [{
          carPartId: shopAParts[0].id,
          itemType: 'CAR_PART',
          itemName: shopAParts[0].name,
          quantity: 2,
          price: shopAParts[0].discountPrice || shopAParts[0].price,
          total: (shopAParts[0].discountPrice || shopAParts[0].price) * 2,
        }],
      },
    },
  });
  console.log(`  ✅ Order ${order1.orderNumber} (Shop A only)`);

  // ORDER 2: Only from Shop B (visible only to Shop B salesman)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SHOPB-001',
      customerId: customer.id,
      salesmanId: salesmanB.id,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      subtotal: (shopBParts[0].price) * 1 + (shopBParts[2].discountPrice || shopBParts[2].price) * 1,
      deliveryFee: 300,
      total: (shopBParts[0].price) * 1 + (shopBParts[2].discountPrice || shopBParts[2].price) * 1 + 300,
      createdAt: oneDayAgo,
      items: {
        create: [
          {
            carPartId: shopBParts[0].id,
            itemType: 'CAR_PART',
            itemName: shopBParts[0].name,
            quantity: 1,
            price: shopBParts[0].price,
            total: shopBParts[0].price * 1,
          },
          {
            carPartId: shopBParts[2].id,
            itemType: 'CAR_PART',
            itemName: shopBParts[2].name,
            quantity: 1,
            price: shopBParts[2].discountPrice || shopBParts[2].price,
            total: (shopBParts[2].discountPrice || shopBParts[2].price) * 1,
          },
        ],
      },
    },
  });
  console.log(`  ✅ Order ${order2.orderNumber} (Shop B only)`);

  // ORDER 3-A & 3-B: Split order (customer ordered from both shops)
  // This simulates when a customer orders parts from multiple shops
  // Each shop gets their own order
  const order3A = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SPLIT-001-A',
      customerId: customer.id,
      salesmanId: salesmanA.id,
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      subtotal: (shopAParts[1].price) * 1,
      deliveryFee: 150,
      total: (shopAParts[1].price) * 1 + 150,
      createdAt: twoDaysAgo,
      items: {
        create: [{
          carPartId: shopAParts[1].id,
          itemType: 'CAR_PART',
          itemName: shopAParts[1].name,
          quantity: 1,
          price: shopAParts[1].price,
          total: shopAParts[1].price * 1,
        }],
      },
    },
  });
  console.log(`  ✅ Order ${order3A.orderNumber} (Split order - Shop A part)`);

  const order3B = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SPLIT-001-B',
      customerId: customer.id,
      salesmanId: salesmanB.id,
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      subtotal: (shopBParts[1].discountPrice || shopBParts[1].price) * 1,
      deliveryFee: 150,
      total: (shopBParts[1].discountPrice || shopBParts[1].price) * 1 + 150,
      createdAt: twoDaysAgo,
      items: {
        create: [{
          carPartId: shopBParts[1].id,
          itemType: 'CAR_PART',
          itemName: shopBParts[1].name,
          quantity: 1,
          price: shopBParts[1].discountPrice || shopBParts[1].price,
          total: (shopBParts[1].discountPrice || shopBParts[1].price) * 1,
        }],
      },
    },
  });
  console.log(`  ✅ Order ${order3B.orderNumber} (Split order - Shop B part)`);

  // ORDER 4: Another Shop A order (delivered)
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SHOPA-002',
      customerId: customer.id,
      salesmanId: salesmanA.id,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      paymentMethod: 'CASH_ON_DELIVERY',
      subtotal: (shopAParts[2].discountPrice || shopAParts[2].price) * 3,
      deliveryFee: 300,
      total: (shopAParts[2].discountPrice || shopAParts[2].price) * 3 + 300,
      createdAt: twoDaysAgo,
      items: {
        create: [{
          carPartId: shopAParts[2].id,
          itemType: 'CAR_PART',
          itemName: shopAParts[2].name,
          quantity: 3,
          price: shopAParts[2].discountPrice || shopAParts[2].price,
          total: (shopAParts[2].discountPrice || shopAParts[2].price) * 3,
        }],
      },
    },
  });
  console.log(`  ✅ Order ${order4.orderNumber} (Shop A - Delivered)`);

  console.log('\n' + '='.repeat(50));
  console.log('✨ SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(50));

  console.log('\n📦 SUMMARY:');
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${createdCars.length} cars`);
  console.log(`   - ${shopAPartsCount} parts (Shop A)`);
  console.log(`   - ${shopBPartsCount} parts (Shop B)`);
  console.log(`   - 5 orders (2 for Shop A, 2 for Shop B, 1 split)`);

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('─'.repeat(50));
  console.log('');
  console.log('🏪 SHOP A SALESMAN:');
  console.log('   Email:    shopa@gmail.com');
  console.log('   Password: password123');
  console.log('   Products: Brakes, Engine Parts, Filters, Lighting, Exhaust, Tires');
  console.log('');
  console.log('🏪 SHOP B SALESMAN:');
  console.log('   Email:    shopb@gmail.com');
  console.log('   Password: password123');
  console.log('   Products: Suspension, Electrical, Interior');
  console.log('');
  console.log('👤 CUSTOMER:');
  console.log('   Email:    customer@gmail.com');
  console.log('   Password: password123');
  console.log('');
  console.log('─'.repeat(50));
  console.log('\n📋 ORDER SPLIT DEMONSTRATION:');
  console.log('   - ORD-SHOPA-001: Visible ONLY to Shop A');
  console.log('   - ORD-SHOPB-001: Visible ONLY to Shop B');
  console.log('   - ORD-SPLIT-001-A: Shop A portion of split order');
  console.log('   - ORD-SPLIT-001-B: Shop B portion of split order');
  console.log('   - ORD-SHOPA-002: Visible ONLY to Shop A');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
