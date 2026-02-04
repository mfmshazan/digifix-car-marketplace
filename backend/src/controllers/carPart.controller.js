import prisma from '../lib/prisma.js';

// ================================
// PUBLIC ROUTES (Customer)
// ================================

// Search parts by car number plate
const searchByNumberPlate = async (req, res) => {
  try {
    const { numberPlate } = req.params;
    const { category, minPrice, maxPrice, condition, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find the car by number plate (case-insensitive)
    const car = await prisma.car.findFirst({
      where: {
        numberPlate: {
          equals: numberPlate.toUpperCase().replace(/\s/g, ''),
          mode: 'insensitive',
        },
      },
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'No car found with this number plate',
        data: null,
      });
    }

    // Build where clause for parts
    const where = {
      carId: car.id,
      isActive: true,
    };

    if (category) {
      where.categoryId = category;
    }

    if (condition) {
      where.condition = condition.toUpperCase();
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Get parts for this car
    const [parts, total] = await Promise.all([
      prisma.carPart.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true, icon: true },
          },
          seller: {
            select: { id: true, name: true },
          },
          car: {
            select: { id: true, numberPlate: true, make: true, model: true, year: true },
          },
        },
      }),
      prisma.carPart.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        car: {
          id: car.id,
          numberPlate: car.numberPlate,
          make: car.make,
          model: car.model,
          year: car.year,
          engineType: car.engineType,
          color: car.color,
          images: car.images,
        },
        parts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Search by number plate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search parts by number plate',
    });
  }
};

// Get all car parts (with filters)
const getAllCarParts = async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      search,
      minPrice,
      maxPrice,
      condition,
      make,
      model,
      year,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isActive: true,
    };

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (condition) {
      where.condition = condition.toUpperCase();
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Filter by car details
    if (make || model || year) {
      where.car = {};
      if (make) where.car.make = { contains: make, mode: 'insensitive' };
      if (model) where.car.model = { contains: model, mode: 'insensitive' };
      if (year) where.car.year = parseInt(year);
    }

    const [parts, total] = await Promise.all([
      prisma.carPart.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true, icon: true },
          },
          seller: {
            select: { id: true, name: true },
          },
          car: {
            select: { id: true, numberPlate: true, make: true, model: true, year: true },
          },
        },
      }),
      prisma.carPart.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        parts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get all car parts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car parts',
    });
  }
};

// Get car part by ID
const getCarPartById = async (req, res) => {
  try {
    const { id } = req.params;

    const part = await prisma.carPart.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, avatar: true, phone: true },
        },
        car: true,
      },
    });

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Car part not found',
      });
    }

    res.json({
      success: true,
      data: part,
    });
  } catch (error) {
    console.error('Get car part error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car part',
    });
  }
};

// Get all cars (for reference)
const getAllCars = async (req, res) => {
  try {
    const { page = '1', limit = '20', search, make, model, year } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      where.OR = [
        { numberPlate: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (make) where.make = { contains: make, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (year) where.year = parseInt(year);

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { parts: true },
          },
        },
      }),
      prisma.car.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        cars,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get all cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cars',
    });
  }
};

// ================================
// SALESMAN/SHOP OWNER ROUTES
// ================================

// Create a new car (for adding parts to)
const createCar = async (req, res) => {
  try {
    const { numberPlate, make, model, year, engineType, color, vinNumber, description, images } = req.body;

    // Validate required fields
    if (!numberPlate || !make || !model || !year) {
      return res.status(400).json({
        success: false,
        message: 'Number plate, make, model, and year are required',
      });
    }

    // Normalize number plate (uppercase, no spaces)
    const normalizedPlate = numberPlate.toUpperCase().replace(/\s/g, '');

    // Check if car already exists
    const existingCar = await prisma.car.findUnique({
      where: { numberPlate: normalizedPlate },
    });

    if (existingCar) {
      return res.status(400).json({
        success: false,
        message: 'A car with this number plate already exists',
        data: existingCar,
      });
    }

    const car = await prisma.car.create({
      data: {
        numberPlate: normalizedPlate,
        make,
        model,
        year: parseInt(year),
        engineType,
        color,
        vinNumber,
        description,
        images: images || [],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      data: car,
    });
  } catch (error) {
    console.error('Create car error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'A car with this number plate or VIN already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create car',
    });
  }
};

// Create a car part (Salesman only)
const createCarPart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      description,
      partNumber,
      price,
      discountPrice,
      stock,
      condition,
      images,
      carId,
      numberPlate, // Alternative: find car by number plate
      categoryId,
    } = req.body;

    // Validate required fields
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required',
      });
    }

    if (!carId && !numberPlate) {
      return res.status(400).json({
        success: false,
        message: 'Either carId or numberPlate is required',
      });
    }

    // Find car by ID or number plate
    let car;
    if (carId) {
      car = await prisma.car.findUnique({ where: { id: carId } });
    } else {
      const normalizedPlate = numberPlate.toUpperCase().replace(/\s/g, '');
      car = await prisma.car.findUnique({ where: { numberPlate: normalizedPlate } });
    }

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found. Please create the car first.',
      });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const carPart = await prisma.carPart.create({
      data: {
        name,
        description,
        partNumber,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        stock: stock ? parseInt(stock) : 0,
        condition: condition?.toUpperCase() || 'NEW',
        images: images || [],
        carId: car.id,
        categoryId,
        sellerId: userId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        car: {
          select: { id: true, numberPlate: true, make: true, model: true, year: true },
        },
        seller: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Car part created successfully',
      data: carPart,
    });
  } catch (error) {
    console.error('Create car part error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create car part',
    });
  }
};

// Update a car part (Salesman only - own parts)
const updateCarPart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const {
      name,
      description,
      partNumber,
      price,
      discountPrice,
      stock,
      condition,
      images,
      categoryId,
      isActive,
    } = req.body;

    // Find existing part
    const existingPart = await prisma.carPart.findUnique({
      where: { id },
    });

    if (!existingPart) {
      return res.status(404).json({
        success: false,
        message: 'Car part not found',
      });
    }

    // Check ownership
    if (existingPart.sellerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own car parts',
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (partNumber !== undefined) updateData.partNumber = partNumber;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (condition !== undefined) updateData.condition = condition.toUpperCase();
    if (images !== undefined) updateData.images = images;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedPart = await prisma.carPart.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
        car: {
          select: { id: true, numberPlate: true, make: true, model: true, year: true },
        },
        seller: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Car part updated successfully',
      data: updatedPart,
    });
  } catch (error) {
    console.error('Update car part error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car part',
    });
  }
};

// Delete a car part (Salesman only - own parts)
const deleteCarPart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Find existing part
    const existingPart = await prisma.carPart.findUnique({
      where: { id },
    });

    if (!existingPart) {
      return res.status(404).json({
        success: false,
        message: 'Car part not found',
      });
    }

    // Check ownership
    if (existingPart.sellerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own car parts',
      });
    }

    await prisma.carPart.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Car part deleted successfully',
    });
  } catch (error) {
    console.error('Delete car part error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car part',
    });
  }
};

// Get salesman's own car parts
const getMyCarParts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [parts, total] = await Promise.all([
      prisma.carPart.findMany({
        where: { sellerId: userId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          car: {
            select: { id: true, numberPlate: true, make: true, model: true, year: true },
          },
        },
      }),
      prisma.carPart.count({ where: { sellerId: userId } }),
    ]);

    res.json({
      success: true,
      data: {
        parts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get my car parts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your car parts',
    });
  }
};

export {
  // Public routes
  searchByNumberPlate,
  getAllCarParts,
  getCarPartById,
  getAllCars,
  // Salesman routes
  createCar,
  createCarPart,
  updateCarPart,
  deleteCarPart,
  getMyCarParts,
};
