const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

router.use(express.json());

router.post('/order', saleController.generateOrder);

module.exports = router;