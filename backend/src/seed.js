import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

const categoriesData = [
  {
    name: 'Essential Maintenance & Service',
    icon: '🔧',
    children: [
      { name: 'Filters & Fluids', description: 'Engine Oil, Oil Filters, Air Filters, Fuel Filters, Coolant, Brake Fluid', icon: '🛢️' },
      { name: 'Braking System', description: 'Brake Pads, Brake Discs/Rotors, Brake Calipers, ABS Sensors', icon: '🛑' },
      { name: 'Belts & Chains', description: 'Timing Belts, Serpentine Belts, Tensioners', icon: '⛓️' },
    ]
  },
  {
    name: 'Engine & Drivetrain',
    icon: '⚙️',
    children: [
      { name: 'Engine Components', description: 'Spark Plugs, Gaskets, Pistons, Valves, Cylinder Heads', icon: '⚙️' },
      { name: 'Transmission', description: 'Gearboxes (Manual/Auto), Clutch Kits, Torque Converters', icon: '⚙️' },
      { name: 'Fuel System', description: 'Fuel Pumps, Injectors, Fuel Tanks, Carburetors', icon: '⛽' },
      { name: 'Cooling & Heating', description: 'Radiators, Water Pumps, Thermostats, Intercoolers', icon: '❄️' },
    ]
  },
  {
    name: 'Suspension & Steering',
    icon: '🚜',
    children: [
      { name: 'Suspension', description: 'Shock Absorbers, Struts, Control Arms, Bushings, Coil Springs', icon: '🚗' },
      { name: 'Steering', description: 'Steering Racks, Tie Rod Ends, Power Steering Pumps', icon: '🚜' },
      { name: 'Wheels & Tires', description: 'New/Used Tires, Alloy Wheels, Hubcaps, Lug Nuts', icon: '🛞' },
    ]
  },
  {
    name: 'Electrical & Lighting',
    icon: '💡',
    children: [
      { name: 'Lighting', description: 'Headlights, Tail Lights, Fog Lights, LED Upgrades, Bulbs', icon: '💡' },
      { name: 'Electrical', description: 'Batteries, Alternators, Starter Motors, Fuses, Wiring Harnesses', icon: '🔋' },
      { name: 'Sensors (ADAS)', description: 'Parking Sensors, O2 Sensors, MAF Sensors, TPMS', icon: '📡' },
    ]
  },
  {
    name: 'Body & Exterior',
    icon: '🚘',
    children: [
      { name: 'Body Panels', description: 'Bumpers, Grilles, Hoods/Bonnets, Fenders, Doors', icon: '🚘' },
      { name: 'Mirrors & Glass', description: 'Side Mirrors, Windshields, Door Glass, Wipers', icon: '🪟' },
      { name: 'Accessories', description: 'Roof Racks, Side Steps, Tow Hitches, Spoilers', icon: '🎒' },
    ]
  },
  {
    name: 'Interior & Comfort',
    icon: '🪑',
    children: [
      { name: 'Upholstery', description: 'Seat Covers, Floor Mats, Dashboard Covers', icon: '🪑' },
      { name: 'Dash & Controls', description: 'Steering Wheels, Gear Knobs, Switches, Gauges', icon: '🕹️' },
      { name: 'AC System', description: 'AC Compressors, Evaporators, Blower Motors', icon: '🌬️' },
    ]
  },
  {
    name: 'Modern & EV Specific',
    icon: '⚡',
    children: [
      { name: 'EV Components', description: 'High-Voltage Batteries, Charging Cables, Inverters, Thermal Management', icon: '⚡' },
    ]
  }
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
    categoryId: categoryMap['Braking System'],
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
    categoryId: categoryMap['Braking System'],
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
    categoryId: categoryMap['Engine Components'],
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
    categoryId: categoryMap['Filters & Fluids'],
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
    categoryId: categoryMap['Filters & Fluids'],
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
    categoryId: categoryMap['Engine Components'], // Moving exhaust to engine components
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
    categoryId: categoryMap['Wheels & Tires'],
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
    categoryId: categoryMap['Upholstery'],
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
  await prisma.product.deleteMany({});
  await prisma.vehicleRegistration.deleteMany({});
  await prisma.vehicleModel.deleteMany({});
  await prisma.vehicleBrand.deleteMany({});
  await prisma.vehicleType.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('  ✅ Data cleared\n');

  // ─── VEHICLE TYPES ───────────────────────────────────────────────────────
  console.log('Creating vehicle types...');
  const vehicleTypes = {};
  
  const passengerCar = await prisma.vehicleType.create({
    data: { name: 'Passenger Car' }
  });
  vehicleTypes['Passenger Car'] = passengerCar.id;
  console.log(`  ✅ ${passengerCar.name}`);

  const motorcycle = await prisma.vehicleType.create({
    data: { name: 'Motorcycle' }
  });
  vehicleTypes['Motorcycle'] = motorcycle.id;
  console.log(`  ✅ ${motorcycle.name}`);

  const truck = await prisma.vehicleType.create({
    data: { name: 'Truck' }
  });
  vehicleTypes['Truck'] = truck.id;
  console.log(`  ✅ ${truck.name}\n`);

  // ─── VEHICLE BRANDS ──────────────────────────────────────────────────────
  console.log('Creating vehicle brands...');
  const vehicleBrands = {};
  const brandNames = ['Toyota', 'Mazda', 'Hyundai', 'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Isuzu', 'Hino', 'Volvo', 'Kenworth', 'Fuso'];
  
  for (const name of brandNames) {
    const brand = await prisma.vehicleBrand.create({
      data: { name }
    });
    vehicleBrands[name] = brand.id;
    console.log(`  ✅ ${name}`);
  }
  console.log('');

  // ─── VEHICLE MODELS ──────────────────────────────────────────────────────
  console.log('Creating vehicle models...');
  
  const vehicleModels = {};
  
  // Passenger Car Models
  const passengerModels = [
    { name: 'Toyota Corolla', brand: 'Toyota', type: 'Passenger Car' },
    { name: 'Toyota Camry', brand: 'Toyota', type: 'Passenger Car' },
    { name: 'Mazda 3', brand: 'Mazda', type: 'Passenger Car' },
    { name: 'Hyundai i30', brand: 'Hyundai', type: 'Passenger Car' },
    { name: 'Honda Civic', brand: 'Honda', type: 'Passenger Car' },
  ];

  for (const model of passengerModels) {
    const created = await prisma.vehicleModel.create({
      data: {
        name: model.name,
        vehicleBrandId: vehicleBrands[model.brand],
        vehicleTypeId: vehicleTypes[model.type],
      }
    });
    vehicleModels[model.name] = created.id;
    console.log(`  ✅ ${model.name}`);
  }

  // Motorcycle Models
  const motorcycleModels = [
    { name: 'Honda CBR500R', brand: 'Honda', type: 'Motorcycle' },
    { name: 'Yamaha MT-07', brand: 'Yamaha', type: 'Motorcycle' },
    { name: 'Kawasaki Ninja 400', brand: 'Kawasaki', type: 'Motorcycle' },
    { name: 'Suzuki GSX-R600', brand: 'Suzuki', type: 'Motorcycle' },
    { name: 'Yamaha YZF-R3', brand: 'Yamaha', type: 'Motorcycle' },
  ];

  for (const model of motorcycleModels) {
    const created = await prisma.vehicleModel.create({
      data: {
        name: model.name,
        vehicleBrandId: vehicleBrands[model.brand],
        vehicleTypeId: vehicleTypes[model.type],
      }
    });
    vehicleModels[model.name] = created.id;
    console.log(`  ✅ ${model.name}`);
  }

  // Truck Models
  const truckModels = [
    { name: 'Isuzu N Series', brand: 'Isuzu', type: 'Truck' },
    { name: 'Hino 300 Series', brand: 'Hino', type: 'Truck' },
    { name: 'Fuso Canter', brand: 'Fuso', type: 'Truck' },
    { name: 'Volvo FH', brand: 'Volvo', type: 'Truck' },
    { name: 'Kenworth T610', brand: 'Kenworth', type: 'Truck' },
  ];

  for (const model of truckModels) {
    const created = await prisma.vehicleModel.create({
      data: {
        name: model.name,
        vehicleBrandId: vehicleBrands[model.brand],
        vehicleTypeId: vehicleTypes[model.type],
      }
    });
    vehicleModels[model.name] = created.id;
    console.log(`  ✅ ${model.name}`);
  }
  console.log('');

  // ─── VEHICLE REGISTRATIONS ───────────────────────────────────────────────
  console.log('Creating vehicle registrations...');
  
  const registrations = [
    // Toyota Corolla — 3 different plates, same model → same products visible to all
    { reg: 'ABC123',     model: 'Toyota Corolla' },
    { reg: 'WP-CAR-001', model: 'Toyota Corolla' },
    { reg: 'NC-1234',    model: 'Toyota Corolla' },
    // Toyota Camry — 2 plates
    { reg: 'XYZ458',     model: 'Toyota Camry' },
    { reg: 'CP-CAM-002', model: 'Toyota Camry' },
    // Mazda 3 — 2 plates
    { reg: 'KLM927',     model: 'Mazda 3' },
    { reg: 'WP-MZD-003', model: 'Mazda 3' },
    // Hyundai i30
    { reg: 'JTR615',     model: 'Hyundai i30' },
    // Honda Civic — 2 plates
    { reg: 'QWE742',     model: 'Honda Civic' },
    { reg: 'SG-CIV-005', model: 'Honda Civic' },
    // Motorcycles
    { reg: 'MTR101', model: 'Honda CBR500R' },
    { reg: 'BIK202', model: 'Yamaha MT-07' },
    { reg: 'RID303', model: 'Kawasaki Ninja 400' },
    { reg: 'GSX404', model: 'Suzuki GSX-R600' },
    { reg: 'YZR505', model: 'Yamaha YZF-R3' },
    // Trucks
    { reg: 'TRK111', model: 'Isuzu N Series' },
    { reg: 'TRK222', model: 'Hino 300 Series' },
    { reg: 'TRK333', model: 'Fuso Canter' },
    { reg: 'TRK444', model: 'Volvo FH' },
    { reg: 'TRK555', model: 'Kenworth T610' },
  ];

  for (const reg of registrations) {
    await prisma.vehicleRegistration.create({
      data: {
        registrationNumber: reg.reg,
        vehicleModelId: vehicleModels[reg.model],
      }
    });
    console.log(`  ✅ ${reg.reg} -> ${reg.model}`);
  }
  console.log('');

  // Create categories
  console.log('Creating categories...');
  const categoryMap = {};
  for (const parentData of categoriesData) {
    const parent = await prisma.category.upsert({
      where: { name: parentData.name },
      update: {},
      create: {
        name: parentData.name,
        icon: parentData.icon,
      },
    });
    console.log(`  ✅ Parent: ${parent.name}`);

    if (parentData.children) {
      for (const childData of parentData.children) {
        const child = await prisma.category.upsert({
          where: { name: childData.name },
          update: {},
          create: {
            ...childData,
            parentId: parent.id,
          },
        });
        categoryMap[child.name] = child.id;
        console.log(`    ✅ Child: ${child.name}`);
      }
    }
  }


  // Create test users
  console.log('\nCreating test users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isVerified: true,
    },
    create: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      name: 'System Admin',
      phone: '+94770000000',
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

   // SHOP A MANAGER
const managerA = await prisma.user.upsert({
  where: { email: 'shopa@gmail.com' },
  update: {
    password: hashedPassword,
    name: 'Shop A Manager',
    role: 'SHOP_MANAGER',
    isVerified: true,
  },
  create: {
    email: 'shopa@gmail.com',
    password: hashedPassword,
    name: 'Shop A Manager',
    phone: '+94771111110',
    role: 'SHOP_MANAGER',
    isVerified: true,
  },
});
console.log(`  ✅ Shop A Manager: ${managerA.email}`);

  // SHOP A - Salesman 1 (Brakes, Engine, Filters, Lighting)
  const salesmanA = await prisma.user.upsert({
  where: { email: 'salesmana@gmail.com' },
  update: {
    password: hashedPassword,
    name: 'Shop A Salesman',
    role: 'SALESMAN',
    isVerified: true,
  },
  create: {
    email: 'salesmana@gmail.com',
    password: hashedPassword,
    name: 'Shop A Salesman',
    phone: '+94771111111',
    role: 'SALESMAN',
    isVerified: true,
  },
});
console.log(`  ✅ Shop A Salesman: ${salesmanA.email}`);

const managerB = await prisma.user.upsert({
  where: { email: 'shopb@gmail.com' },
  update: {
    password: hashedPassword,
    name: 'Shop B Manager',
    role: 'SHOP_MANAGER',
    isVerified: true,
  },
  create: {
    email: 'shopb@gmail.com',
    password: hashedPassword,
    name: 'Shop B Manager',
    phone: '+94772222220',
    role: 'SHOP_MANAGER',
    isVerified: true,
  },
});
console.log(`  ✅ Shop B Manager: ${managerB.email}`);

 

  // SHOP B - Salesman 2 (Suspension, Electrical, Interior)
  const salesmanB = await prisma.user.upsert({
  where: { email: 'salesmanb@gmail.com' },
  update: {
    password: hashedPassword,
    name: 'Shop B Salesman',
    role: 'SALESMAN',
    isVerified: true,
  },
  create: {
    email: 'salesmanb@gmail.com',
    password: hashedPassword,
    name: 'Shop B Salesman',
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

  // ─── PRODUCTS (linked to vehicle model, not a specific plate) ────────────
  // Any registration that shares the same vehicleModel will see these products.
  console.log('\nCreating products (by vehicle model)...');

  const shopAProducts = [
    // Toyota Corolla
    { name: 'Front Brake Pad Set - Corolla', description: 'Ceramic front brake pads for Toyota Corolla. Excellent stopping power.', price: 8500, discountPrice: 7500, stock: 15, sku: 'P-A-BRK-COR-001', categoryId: categoryMap['Braking System'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    { name: 'Spark Plug Set - Corolla', description: 'Iridium spark plugs for Toyota Corolla. Better fuel efficiency.', price: 4500, discountPrice: 3800, stock: 25, sku: 'P-A-ENG-COR-002', categoryId: categoryMap['Engine Components'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    { name: 'Engine Oil Filter - Corolla', description: 'OEM oil filter for Toyota Corolla.', price: 1200, discountPrice: 950, stock: 50, sku: 'P-A-FLT-COR-003', categoryId: categoryMap['Filters & Fluids'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    { name: 'LED Headlight Bulbs - Corolla', description: '6000K LED headlight pair for Toyota Corolla.', price: 6500, discountPrice: 5500, stock: 20, sku: 'P-A-LGT-COR-004', categoryId: categoryMap['Lighting'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    // Toyota Camry
    { name: 'Front Brake Pad Set - Camry', description: 'Ceramic front brake pads for Toyota Camry.', price: 9500, discountPrice: 8500, stock: 12, sku: 'P-A-BRK-CAM-001', categoryId: categoryMap['Braking System'], vehicleModelId: vehicleModels['Toyota Camry'] },
    { name: 'Air Filter - Camry', description: 'High-flow air filter for Toyota Camry.', price: 2800, discountPrice: 2300, stock: 30, sku: 'P-A-FLT-CAM-002', categoryId: categoryMap['Filters & Fluids'], vehicleModelId: vehicleModels['Toyota Camry'] },
    { name: 'All-Season Tire - Camry', description: 'Premium all-season tire for Toyota Camry.', price: 14000, discountPrice: 12500, stock: 16, sku: 'P-A-TIR-CAM-003', categoryId: categoryMap['Wheels & Tires'], vehicleModelId: vehicleModels['Toyota Camry'] },
    // Honda Civic
    { name: 'Front Brake Pad Set - Civic', description: 'High-performance brake pads for Honda Civic Turbo.', price: 8800, discountPrice: 7800, stock: 18, sku: 'P-A-BRK-CIV-001', categoryId: categoryMap['Braking System'], vehicleModelId: vehicleModels['Honda Civic'] },
    { name: 'Engine Oil Filter - Civic', description: 'OEM oil filter for Honda Civic 1.5T.', price: 1400, discountPrice: 1100, stock: 40, sku: 'P-A-FLT-CIV-002', categoryId: categoryMap['Filters & Fluids'], vehicleModelId: vehicleModels['Honda Civic'] },
    { name: 'LED Headlight Bulbs - Civic', description: '6000K LED headlight pair for Honda Civic.', price: 6800, discountPrice: 5800, stock: 22, sku: 'P-A-LGT-CIV-003', categoryId: categoryMap['Lighting'], vehicleModelId: vehicleModels['Honda Civic'] },
    // Mazda 3
    { name: 'Spark Plug Set - Mazda 3', description: 'Iridium spark plugs for Mazda 3.', price: 5000, discountPrice: 4200, stock: 20, sku: 'P-A-ENG-MZD-001', categoryId: categoryMap['Engine Components'], vehicleModelId: vehicleModels['Mazda 3'] },
    { name: 'Air Filter - Mazda 3', description: 'High-flow air filter for Mazda 3.', price: 2600, stock: 25, sku: 'P-A-FLT-MZD-002', categoryId: categoryMap['Filters & Fluids'], vehicleModelId: vehicleModels['Mazda 3'] },
  ];

  const shopBProducts = [
    // Toyota Corolla
    { name: 'Front Shock Absorber - Corolla', description: 'Gas-filled front shock absorber for Toyota Corolla.', price: 15000, stock: 10, sku: 'P-B-SUS-COR-001', categoryId: categoryMap['Suspension'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    { name: 'Car Battery 12V 60Ah - Corolla', description: 'Maintenance-free battery for Toyota Corolla. 2-year warranty.', price: 22000, discountPrice: 19500, stock: 12, sku: 'P-B-ELC-COR-002', categoryId: categoryMap['Electrical'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    { name: 'Car Floor Mats - Corolla', description: 'Custom-fit rubber floor mats for Toyota Corolla.', price: 4500, discountPrice: 3800, stock: 15, sku: 'P-B-INT-COR-003', categoryId: categoryMap['Upholstery'], vehicleModelId: vehicleModels['Toyota Corolla'] },
    // Honda Civic
    { name: 'Front Shock Absorber - Civic', description: 'Sport-tuned shock absorber for Honda Civic.', price: 16500, stock: 8, sku: 'P-B-SUS-CIV-001', categoryId: categoryMap['Suspension'], vehicleModelId: vehicleModels['Honda Civic'] },
    { name: 'Alternator - Civic', description: 'High-output alternator for Honda Civic 1.5T.', price: 35000, stock: 5, sku: 'P-B-ELC-CIV-002', categoryId: categoryMap['Electrical'], vehicleModelId: vehicleModels['Honda Civic'] },
    // Hyundai i30
    { name: 'Rear Coil Spring Set - i30', description: 'Heavy-duty rear coil springs for Hyundai i30.', price: 18000, discountPrice: 16000, stock: 6, sku: 'P-B-SUS-I30-001', categoryId: categoryMap['Suspension'], vehicleModelId: vehicleModels['Hyundai i30'] },
    { name: 'Car Battery 12V 55Ah - i30', description: 'Maintenance-free battery for Hyundai i30.', price: 20000, discountPrice: 18000, stock: 10, sku: 'P-B-ELC-I30-002', categoryId: categoryMap['Electrical'], vehicleModelId: vehicleModels['Hyundai i30'] },
    { name: 'Car Floor Mats - i30', description: 'Custom-fit rubber floor mats for Hyundai i30.', price: 4200, discountPrice: 3500, stock: 15, sku: 'P-B-INT-I30-003', categoryId: categoryMap['Upholstery'], vehicleModelId: vehicleModels['Hyundai i30'] },
    // Mazda 3
    { name: 'Front Shock Absorber - Mazda 3', description: 'Gas-filled front shock absorber for Mazda 3.', price: 14500, stock: 9, sku: 'P-B-SUS-MZD-001', categoryId: categoryMap['Suspension'], vehicleModelId: vehicleModels['Mazda 3'] },
  ];

  let productCount = 0;
  for (const p of shopAProducts) {
    await prisma.product.create({
      data: { ...p, salesmanId: salesmanA.id, isActive: true, approvalStatus: 'APPROVED', images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'] },
    });
    productCount++;
  }
  for (const p of shopBProducts) {
    await prisma.product.create({
      data: { ...p, salesmanId: salesmanB.id, isActive: true, approvalStatus: 'APPROVED', images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'] },
    });
    productCount++;
  }
  console.log(`  ✅ ${productCount} products created (model-based, visible to all matching plates)`);

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
  console.log(`   - ${categoriesData.length} parent categories`);

  console.log(`   - ${createdCars.length} cars (old CarPart system)`);
  console.log(`   - ${shopAPartsCount} parts (Shop A)`);
  console.log(`   - ${shopBPartsCount} parts (Shop B)`);
  console.log(`   - ${productCount} products (new model-based system, approved)`);
  console.log(`   - 20 vehicle registrations (multiple plates per model)`);
  console.log(`   - 5 orders (2 for Shop A, 2 for Shop B, 1 split)`);

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('─'.repeat(50));
  console.log('');
  console.log('� SHOP A MANAGER (Dashboard with Add Product):');
  console.log('   Email:    shopa@gmail.com');
  console.log('   Password: password123');
  console.log('');
  console.log('👨‍💼 SHOP A SALESMAN:');
  console.log('   Email:    salesmana@gmail.com');
  console.log('   Password: password123');
  console.log('   Products: Brakes, Engine Parts, Filters, Lighting, Exhaust, Tires');
  console.log('');
  console.log('🏢 SHOP B MANAGER (Dashboard with Add Product):');
  console.log('   Email:    shopb@gmail.com');
  console.log('   Password: password123');
  console.log('');
  console.log('👨‍💼 SHOP B SALESMAN:');
  console.log('   Email:    salesmanb@gmail.com');
  console.log('   Password: password123');
  console.log('   Products: Suspension, Electrical, Interior');
  console.log('');
  console.log('👤 CUSTOMER:');
  console.log('   Email:    customer@gmail.com');
  console.log('   Password: password123');
  console.log('');
  console.log('🛡️  ADMIN:');
  console.log('   Email:    admin@gmail.com');
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
