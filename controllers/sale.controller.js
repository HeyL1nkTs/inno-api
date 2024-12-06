const _ = require('lodash');
const Order = require('../models/order');
const Product = require('../models/product');
const Supply = require('../models/supply');
const Combo = require('../models/combo');
const { emitPaymentInfo } = require('../service/socket.service');

async function generateOrder(req, res) {
    try {
        const { orders, paymentInfo, seller } = req.body;

        if (!orders || !paymentInfo || !seller) {
            return res.status(400).json({ message: 'Missing sales or payment or seller info' });
        }

        // Procesar cada orden
        for (const order of orders) {
            await processOrder(order);
        }

        // Almacenar la orden en la base de datos
        const newOrder = new Order({ orders, paymentInfo });
        await newOrder.save();

        const paymentInfoCopy = {
            orderNumber : newOrder._id,
            paymentMethod : paymentInfo.type,
            amountReceived : paymentInfo.amountReceived,
            change : paymentInfo.change,
            total : paymentInfo.total,
            seller : seller.name,
            date : new Date()
        }

        // Emitir los datos de paymentInfo al administrador
        emitPaymentInfo(paymentInfoCopy);

        return res.status(200).json({ message: 'Order generated successfully' });
    } catch (error) {
        console.error('Error generating order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function processOrder(order) {
    try {
        if (order.supplies) {
            for (const supply of order.supplies) {
                if (supply.price === 0) continue;

                const supplyDB = await Supply.findById(supply.id);
                if (supplyDB) {
                    supplyDB.stock -= 1;
                    await supplyDB.save();
                }
            }
        }

        if (order.products) {
            for (const product of order.products) {
                const productDB = await Product.findById(product.id);
                if (productDB) {
                    productDB.stock -= 1;
                    await productDB.save();
                }
            }
        }

        if (order.isProduct) {
            const productDB = await Product.findOne({ name: order.name });
            if (productDB) {
                productDB.stock -= 1;
                await productDB.save();
            }
        }

        if (order.isCombo) {
            const comboDB = await Combo.findOne({ name: order.name });
            if (comboDB) {
                comboDB.stock -= 1;
                await comboDB.save();
            }
        }
    } catch (error) {
        console.error('Error processing order:', error);
        throw new Error('Error processing order');
    }
}


module.exports = {
    generateOrder,
};
