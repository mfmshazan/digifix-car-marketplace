import express from 'express';
import vehicleController from '../controllers/vehicle.controller.js';

const router = express.Router();

/**
 * GET /vehicle-types
 * Get all vehicle types
 * Access: Public
 */
router.get('/types', vehicleController.getVehicleTypes);

/**
 * GET /vehicle-brands
 * Get all vehicle brands
 * Access: Public
 */
router.get('/brands', vehicleController.getVehicleBrands);

/**
 * GET /vehicle-brands/by-type/:vehicleTypeId
 * Get vehicle brands filtered by vehicle type
 * Access: Public
 */
router.get('/brands/by-type/:vehicleTypeId', vehicleController.getVehicleBrandsByType);

/**
 * GET /vehicle-models
 * Get all vehicle models
 * Access: Public
 */
router.get('/models', vehicleController.getVehicleModels);

/**
 * GET /vehicle-models/by-brand/:brandId
 * Get vehicle models filtered by brand
 * Access: Public
 */
router.get('/models/by-brand/:brandId', vehicleController.getVehicleModelsByBrand);

/**
 * GET /vehicle/search/:registrationNumber
 * Search vehicle by registration number
 * Access: Public
 */
router.get('/search/:registrationNumber', vehicleController.searchVehicleByRegistration);

export default router;
