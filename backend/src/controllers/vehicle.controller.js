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
 * Search vehicle by registration number and return compatible products + part types.
 * GET /vehicle/search/:registrationNumber
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     registration: { id, registrationNumber, vehicleModelId },
 *     vehicleInfo: {
 *       type:  { id, name }   // e.g. Passenger Car
 *       brand: { id, name }   // e.g. Toyota
 *       model: { id, name }   // e.g. Corolla
 *     },
 *     compatibleProducts: Product[],
 *     compatiblePartTypes: { id, name, icon, productCount }[]
 *   }
 * }
 */
const searchVehicleByRegistration = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    // Validate
    if (!registrationNumber || registrationNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'registrationNumber is required',
      });
    }

    // 1. Resolve registration → vehicleModel (with brand + type)
    const registration = await prisma.vehicleRegistration.findUnique({
      where: { registrationNumber: registrationNumber.trim().toUpperCase() },
      include: {
        vehicleModel: {
          include: {
            vehicleBrand: { select: { id: true, name: true } },
            vehicleType:  { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: `No vehicle found with registration number "${registrationNumber.toUpperCase()}"`,
      });
    }

    const { vehicleModel } = registration;

    // 2. Fetch all active + approved Products compatible with this vehicle model.
    // A product matches either via its primary vehicleModelId (legacy single-model
    // products) or via the compatibleModels many-to-many (manager selected multiple
    // models for one listing).
    const compatibleProducts = await prisma.product.findMany({
      where: {
        OR: [
          { vehicleModelId: vehicleModel.id },
          { compatibleModels: { some: { id: vehicleModel.id } } },
        ],
        isActive: true,
        approvalStatus: 'APPROVED',
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        salesman: { select: { id: true, name: true } },
        store:    { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Derive unique part types (categories) from those products
    const partTypeMap = new Map();
    for (const product of compatibleProducts) {
      if (product.category) {
        const { id, name, icon } = product.category;
        if (partTypeMap.has(id)) {
          partTypeMap.get(id).productCount += 1;
        } else {
          partTypeMap.set(id, { id, name, icon: icon || null, productCount: 1 });
        }
      }
    }
    const compatiblePartTypes = Array.from(partTypeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.json({
      success: true,
      data: {
        registration: {
          id: registration.id,
          registrationNumber: registration.registrationNumber,
          vehicleModelId: registration.vehicleModelId,
        },
        vehicleInfo: {
          type:  vehicleModel.vehicleType,
          brand: vehicleModel.vehicleBrand,
          model: { id: vehicleModel.id, name: vehicleModel.name },
        },
        compatibleProducts,
        compatiblePartTypes,
      },
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
