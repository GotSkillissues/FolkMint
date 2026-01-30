const express = require('express');
const router = express.Router();
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { authenticate } = require('../middleware/authMiddleware');

// All address routes require authentication
router.use(authenticate);

// Get user's addresses
router.get('/', getAddresses);

// Get address by ID
router.get('/:id', getAddressById);

// Create new address
router.post('/', createAddress);

// Update address
router.put('/:id', updateAddress);

// Set default address
router.put('/:id/default', setDefaultAddress);

// Delete address
router.delete('/:id', deleteAddress);

module.exports = router;
