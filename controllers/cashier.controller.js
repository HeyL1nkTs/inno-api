const Cashier = require('../models/cashier');
require('dotenv').config();
const { closeSession, closeAllCashiers, openAllCashier } = require('../service/socket.service');

async function openCashier(req, res) {
    try {
        const io = req.app.io;

        const cashierData = {
            initial_amount: 0,
            status: 'open'
        }

        const cashier = await Cashier.create(cashierData);

        const cashierInfo = {
            status: 'open',
            current_amount: cashier.initial_amount,
            cashierId: cashier._id
        }

        if(cashier) {
            openAllCashier(io, cashierInfo);
        }

        res.status(201).json(cashierInfo);
    } catch (error) {
        console.error('Error al abrir caja:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al abrir caja');
    }
}

async function closeCashier(req, res) {
    try {
        const { id } = req.params;
        const io = req.app.io;

        const cashier = await Cashier.findByIdAndDelete(id);

        if (!cashier) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        closeSession(io);
        closeAllCashiers(io);

        res.status(200).json(cashier);
    } catch (error) {
        console.error('Error al cerrar caja:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al cerrar caja');
    }
}

async function getChashierIfExist(req, res) {
    try {
        const cashier = await Cashier.findOne({ status: 'open' });

        if (!cashier) {
            const cashierInfo = {
                status: 'close',
                initial_amount: 0,
                cashierId: null
            }

            return res.status(200).json(cashierInfo);
        }

        const newCashier = {
            cashierStatus: cashier.status,
            current_amount: cashier.initial_amount,
            cashierId: cashier._id
        }

        res.status(200).json(newCashier);
    }
    catch (error) {
        console.error('Error al obtener caja:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al obtener caja');
    }
}

async function updateCashierData(newAmount) {
    try {

        const cashier = await Cashier.findByIdAndUpdate(id, {initial_amount: newAmount}, { new: true });

        return cashier;
    }
    catch (error) {
        console.error('Error al actualizar caja:', error);
    }
}

async function getCashierAmount(id){
    try {
        const cashier = await Cashier.findById(id);

        return cashier.initial_amount;
    } catch (error) {
        console.error('Error al obtener caja:', error);
    }
}

module.exports = {
    openCashier,
    closeCashier,
    getChashierIfExist
}
