import { Router } from 'express';
import {
  searchByNumberPlate,
  getAllCarParts,
  getCarPartById,
  getAllCars,
  createCar,
  createCarPart,
  updateCarPart,
  deleteCarPart,
  getMyCarParts,
} from '../controllers/carPart.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// ================================
// PUBLIC ROUTES (Anyone can access)
// ================================

// Search parts by car number plate - MAIN FEATURE
// GET /api/car-parts/search/:numberPlate
router.get('/search/:numberPlate', searchByNumberPlate);

// Get all car parts with filters
// GET /api/car-parts
router.get('/', getAllCarParts);

// Get all cars
// GET /api/car-parts/cars
router.get('/cars', getAllCars);

// Get single car part by ID
// GET /api/car-parts/:id
router.get('/:id', getCarPartById);

// ================================
// SALESMAN/SHOP OWNER ROUTES (Authenticated + SALESMAN role)
// ================================

// Get my car parts (salesman's own listings)
// GET /api/car-parts/salesman/my-parts
router.get('/salesman/my-parts', authenticate, authorize('SALESMAN'), getMyCarParts);

// Create a new car
// POST /api/car-parts/cars
router.post('/cars', authenticate, authorize('SALESMAN'), createCar);

// Create a new car part
// POST /api/car-parts
router.post('/', authenticate, authorize('SALESMAN'), createCarPart);

// Update a car part
// PUT /api/car-parts/:id
router.put('/:id', authenticate, authorize('SALESMAN'), updateCarPart);

// Delete a car part
// DELETE /api/car-parts/:id
router.delete('/:id', authenticate, authorize('SALESMAN'), deleteCarPart);

export default router;
