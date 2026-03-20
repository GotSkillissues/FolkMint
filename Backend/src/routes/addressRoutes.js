const express = require('express');
const router = express.Router();

const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} = require('../controllers/addressController');

const { authenticate } = require('../middleware/authMiddleware');

// All address routes require authentication
router.use(authenticate);

// GET /api/addresses
router.get('/', getAddresses);

// POST /api/addresses
router.post('/', createAddress);

// GET /api/addresses/:id
router.get('/:id', getAddressById);

// PATCH /api/addresses/:id
router.patch('/:id', updateAddress);

// PATCH /api/addresses/:id/default
// Must be before /:id to avoid ambiguity — but Express handles this correctly
// because /default is a longer, more specific match after the param segment
router.patch('/:id/default', setDefaultAddress);

// DELETE /api/addresses/:id
router.delete('/:id', deleteAddress);

module.exports = router;