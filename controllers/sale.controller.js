const _ = require('lodash');
const Order = require('../models/order');
const Product = require('../models/product');
const Supply = require('../models/supply');
const Combo = require('../models/combo');
const Cashier = require('../models/cashier');
const Sale = require('../models/sale');
const { emitPaymentInfo } = require('../service/socket.service');

async function generateOrder(req, res) {
    try {
        const { orders, paymentInfo, seller } = req.body;
        const { io } = req.app;

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
            orderNumber: newOrder._id,
            paymentMethod: paymentInfo.type,
            amountReceived: paymentInfo.amountReceived,
            change: paymentInfo.change,
            total: paymentInfo.total,
            seller: seller.name,
            date: new Date()
        }

        const cashier = await Cashier.findOne({ status: 'open' });
        let total = 0;
        if (cashier) { // Si hay una caja abierta, sumar el total de la venta al monto inicial
            total = cashier.initial_amount + paymentInfo.total;
            await Cashier.updateOne({ status: 'open' }, { initial_amount: total }); //actualizar el monto de la caja
        }

        const consolidatedOrder = {
            paymentInfo: paymentInfoCopy,
            currentAmount: total,
        }

        // Emitir los datos de paymentInfo al administrador
        emitPaymentInfo(io, consolidatedOrder);

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

/**
 * @description Consolidates orders by day, calculating total sales and finding the most sold product.
 * Marks consolidated orders to avoid reprocessing and saves consolidated data to a new collection.
 * @returns {Promise<Object[]>} An array of consolidated sales data grouped by day.
 */
async function consolidateOrders() { //req, res for testing
    try {
        // Obtener todas las órdenes no consolidadas agrupadas por día
        const ordersByDay = await Order.aggregate([
            {
                $match: { isConsolidated: { $ne: true } }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    orders: { $push: '$orders' },
                    paymentInfo: { $push: '$paymentInfo' },
                    ids: { $push: '$_id' },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $last: '$updatedAt' }
                }
            }
        ]);

        const consolidatedSales = [];

        for (const day of ordersByDay) {
            let totalSales = 0;
            const productCount = {};

            day.orders.flat().forEach(order => {
                totalSales += order.price;
                const key = order.name;

                if (!productCount[key]) {
                    productCount[key] = {
                        count: 0,
                        name: order.name,
                        isCombo: order.isCombo || false,
                        isProduct: order.isProduct || false,
                    };
                }

                productCount[key].count += 1;
            });

            const mostSoldProduct = Object.values(productCount).reduce((max, product) => {
                return product.count > max.count ? product : max;
            }, { count: 0 });

            let elemento;

            if (mostSoldProduct.isCombo) {
                elemento = await Combo.findOne({ name: mostSoldProduct.name }).select('_id name image_url');
            } else if (mostSoldProduct.isProduct) {
                elemento = await Product.findOne({ name: mostSoldProduct.name }).select('_id name image_url');
            }

            const consolidatedData = {
                day: day._id,
                total: totalSales,
                mostSoldProd: {
                    element: elemento,
                    isCombo: mostSoldProduct.isCombo,
                    isProduct: mostSoldProduct.isProduct,
                },
                createdAt: day.createdAt,
                updatedAt: day.updatedAt,
            };

            try {
                await Sale.create(consolidatedData);

                try {
                    await Order.updateMany(
                        { _id: { $in: day.ids } },
                        { $set: { isConsolidated: true } }
                    );
                } catch (error) {
                    console.error(`Error al actualizar las órdenes del día ${day._id}:`, error);
                    throw error;
                }
            } catch (error) {
                console.error(`Error procesando día ${day._id}:`, error);
                throw error;
            }

            consolidatedSales.push(consolidatedData);
        }

        //res.status(200).json({ message: 'Orders consolidated successfully' });
        return consolidatedSales;

    } catch (error) {
        console.error('Error consolidating orders:', error);
        throw new Error('Error consolidating orders');
    }
}

async function resetOrdersTesting(req, res) {
    try {
        const result = await Order.updateMany(
            { isConsolidated: true }, // Condición: solo las órdenes con isConsolidated: true
            { $set: { isConsolidated: false } } // Actualización: establecer a false
        );
        res.status(200).json({ message: 'Orders reset successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * @description Generates chart data and the most sold product for the specified time period.
 * @param {Object} req - The HTTP request object containing the type ('day', 'week', or 'month').
 * @param {Object} res - The HTTP response object.
 */
async function generateDashboardData(req, res) {
    try {
        const { type } = req.params;

        // Validación del tipo
        if (!['day', 'week', 'month'].includes(type)) {
            return res.status(400).send({ error: 'Invalid type. Use day, week, or month.' });
        }

        // Fechas límites basadas en el tipo
        const now = new Date();
        let startDate;

        if (type === 'day') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7); // Últimos 7 días
        } else if (type === 'week') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 35); // Últimas 5 semanas (7 días * 5 semanas)
        } else if (type === 'month') {
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1); // Últimos 12 meses
        }

        // Consultar las ventas dentro del rango de fechas
        const sales = await Sale.find({ createdAt: { $gte: startDate, $lte: now } });

        // Agrupar y calcular datos
        const chartData = [];
        const productSales = new Map();
        let mostSoldProduct = null;
        let maxSales = 0;

        // Iterar sobre las ventas para procesar los datos
        sales.forEach((sale) => {
            const productName = sale.mostSoldProd.element.name;

            // Incrementar el conteo del producto en el mapa
            const currentSales = productSales.get(productName) || 0;
            productSales.set(productName, currentSales + 1);
        });

        // Determinar el producto más vendido
        productSales.forEach((count, productName) => {
            if (count > maxSales) {
                // Buscar el producto en las ventas para obtener su información completa
                const saleWithProduct = sales.find(
                    (sale) => sale.mostSoldProd.element.name === productName
                );

                mostSoldProduct = saleWithProduct.mostSoldProd.element; // Información completa del producto
                maxSales = count;
            }
        });

        // Crear los datos del gráfico
        if (type === 'day') {
            // Agrupación por día de la semana
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            sales.forEach((sale) => {
                const day = daysOfWeek[new Date(sale.createdAt).getDay()];
                const existingDay = chartData.find((data) => data.x === day);

                if (existingDay) {
                    existingDay.y += sale.total;
                } else {
                    chartData.push({ x: day, y: sale.total });
                }
            });
        } else if (type === 'week') {
            // Agrupación por semanas
            sales.forEach((sale) => {
                const week = Math.ceil(new Date(sale.createdAt).getDate() / 7);
                const existingWeek = chartData.find((data) => data.x === `Week ${week}`);

                if (existingWeek) {
                    existingWeek.y += sale.total;
                } else {
                    chartData.push({ x: `Week ${week}`, y: sale.total });
                }
            });
        } else if (type === 'month') {
            // Agrupación por meses
            sales.forEach((sale) => {
                const month = new Date(sale.createdAt).toLocaleString('default', { month: 'long' });
                const existingMonth = chartData.find((data) => data.x === month);

                if (existingMonth) {
                    existingMonth.y += sale.total;
                } else {
                    chartData.push({ x: month, y: sale.total });
                }
            });
        }

        // Responder con los datos generados
        res.status(200).send({ chartData, mostSoldProduct });
    } catch (error) {
        console.error('Error generating dashboard data:', error);
        res.status(500).send({ error: 'An error occurred while generating dashboard data.' });
    }
}

module.exports = { generateDashboardData };


module.exports = {
    generateOrder,
    consolidateOrders,
    resetOrdersTesting,
    generateDashboardData
};
