import prisma from '../lib/prisma.js';

// ─── VEHICLE TYPES ───────────────────────────────────────────────────────

/**
 * Get all vehicle types
 * GET /vehicle-types
 */
const getVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = await prisma.vehicleType.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: vehicleTypes,
    });
  } catch (error) {
    console.error('Get vehicle types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle types',
    });
  }
};

// ─── VEHICLE BRANDS ──────────────────────────────────────────────────────

/**
 * Get all vehicle brands
 * GET /vehicle-brands
 */
const getVehicleBrands = async (req, res) => {
  try {
    const vehicleBrands = await prisma.vehicleBrand.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: vehicleBrands,
    });
  } catch (error) {
    console.error('Get vehicle brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle brands',
    });
  }
};

/**
 * Get vehicle brands by type
 * GET /vehicle-brands/by-type/:vehicleTypeId
 */
const getVehicleBrandsByType = async (req, res) => {
  try {
    const { vehicleTypeId } = req.params;

    // Validate vehicleTypeId
    if (!vehicleTypeId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleTypeId is required',
      });
    }

    // Get all vehicle models for this type to extract unique brands
    const models = await prisma.vehicleModel.findMany({
      where: { vehicleTypeId },
      include: {
        vehicleBrand: true,
      },
    });

    // Extract unique brands
    const brandMap = new Map();
    models.forEach(model => {
      brandMap.set(model.vehicleBrand.id, model.vehicleBrand);
    });

    const brands = Array.from(brandMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error('Get vehicle brands by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle brands for this type',
    });
  }
};

// ─── VEHICLE MODELS ──────────────────────────────────────────────────────

/**
 * Get all vehicle models
 * GET /vehicle-models
 */
const getVehicleModels = async (req, res) => {
  try {
    const vehicleModels = await prisma.vehicleModel.findMany({
      include: {
        vehicleBrand: {
          select: { id: true, name: true },
        },
        vehicleType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: vehicleModels,
    });
  } catch (error) {
    console.error('Get vehicle models error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle models',
    });
  }
};

/**
 * Get vehicle models by brand
 * GET /vehicle-models/by-brand/:brandId
 */
const getVehicleModelsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Validate brandId
    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'brandId is required',
      });
    }

    const vehicleModels = await prisma.vehicleModel.findMany({
      where: { vehicleBrandId: brandId },
      include: {
        vehicleBrand: {
          select: { id: true, name: true },
        },
        vehicleType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: vehicleModels,
    });
  } catch (error) {
    console.error('Get vehicle models by brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle models for this brand',
    });
  }
};

// ─── VEHICLE REGISTRATION ───────────────────────────────────────────────

/**
 * Search vehicle by registration number
 * GET /vehicle/search/:registrationNumber
 */
const searchVehicleByRegistration = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    // Validate registrationNumber
    if (!registrationNumber || registrationNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'registrationNumber is required',
      });
    }

    const registration = await prisma.vehicleRegistration.findUnique({
      where: { registrationNumber: registrationNumber.toUpperCase() },
      include: {
        vehicleModel: {
          include: {
            vehicleBrand: {
              select: { id: true, name: true },
            },
            vehicleType: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle registration not found',
      });
    }

    res.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error('Search vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vehicle',
    });
  }
};

export default {
  getVehicleTypes,
  getVehicleBrands,
  getVehicleBrandsByType,
  getVehicleModels,
  getVehicleModelsByBrand,
  searchVehicleByRegistration,
};
