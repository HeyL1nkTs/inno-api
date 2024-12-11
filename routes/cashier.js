const express = require('express');
const router = express.Router();
const cashierController = require('../controllers/cashier.controller');

router.use(express.json());

router.post('/open', cashierController.openCashier);
router.delete('/close/:id', cashierController.closeCashier);

router.get('/exist', cashierController.getChashierIfExist);

module.exports = router;
