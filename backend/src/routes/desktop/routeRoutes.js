const express = require('express');
const router = express.Router();
const routeController = require('../../controllers/routeController');
const { protect } = require('../../middleware/auth');

// Route management routes (all require authentication)
router.get('/', protect, routeController.getAllRoutes);
router.get('/:id', protect, routeController.getRouteById);
router.post('/', protect, routeController.createRoute);
router.put('/:id', protect, routeController.updateRoute);
router.delete('/:id', protect, routeController.deleteRoute);

module.exports = router;
