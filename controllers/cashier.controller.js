const Cashier = require('../models/cashier');
require('dotenv').config();
const { closeSession } = require('../service/socket.service');

async function openCashier(req, res) {
    try {
        const cashierData = {
            initial_amount: process.env.initialAmount,
            status: 'open'
        }

        const cashier = await Cashier.create(cashierData);
        res.status(201).json(cashier);
    } catch (error) {
        console.error('Error al abrir caja:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al abrir caja');
    }
}

async function closeCashier(req, res) {
    try {
        const { id } = req.params;

        const cashier = await Cashier.findByIdAndDelete(id);

        if (!cashier) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        closeSession();

        res.status(200).json(cashier);
    } catch (error) {
        console.error('Error al cerrar caja:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al cerrar caja');
    }
}

module.exports = {
    openCashier,
    closeCashier
}
