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

// PATCH /api/addresses/:id/default  ← MUST be before /:id
router.patch('/:id/default', setDefaultAddress);

// PATCH /api/addresses/:id
router.patch('/:id', updateAddress);

// DELETE /api/addresses/:id
router.delete('/:id', deleteAddress);

module.exports = router;