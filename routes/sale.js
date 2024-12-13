const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

router.use(express.json());

router.post('/order', saleController.generateOrder);
router.get('/dashboard/:type', saleController.generateDashboardData);

router.get('/consolidateOrders-test', saleController.consolidateOrders);
router.get('/resetOrders-test', saleController.resetOrdersTesting);

module.exports = router;