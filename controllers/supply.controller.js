const Supply = require('../models/supply');
const Product = require('../models/product');
const SupplySchema = require('../schemas/supply');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');

const defaultSchema = Joi.object({
    _id: Joi.string().allow(''),
    name: Joi.string().trim().required(),
    price: Joi.number().required(),
    image_url: Joi.string().allow(''),
    haveStock: Joi.boolean().required(),
    stock: Joi.number()
});

/**
 * @description Obtener suministros
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Supply array
 */
async function getSupplies(req, res) {
    try {
        const { id, name } = req.query;

        let supplies;

        if (id) {
            supplies = await Supply.findById(id);
            if (!supplies) {
                return res.status(404).send('Suministro no encontrado');
            }
            supplies = [supplies]; // Convertimos a array para procesamiento uniforme
        } else if (name) {
            supplies = await Supply.findOne({ name });
            if (!supplies) {
                return res.status(404).send('Suministro no encontrado');
            }
            supplies = [supplies]; // Convertimos a array para procesamiento uniforme
        } else {
            supplies = await Supply.find();
        }

        // Agrega la imagen en base64 a cada suministro usando un bucle for...of
        for (const supply of supplies) {
            if (supply.image_url) {
                const imagePath = path.join(__dirname, '..', 'resources', supply.image_url);
                try {
                    const image = await fs.readFile(imagePath); // Lee la imagen del sistema de archivos
                    supply.image_url = `data:image/jpeg;base64,${image.toString('base64')}`; // Convierte a base64
                } catch (err) {
                    console.error(`Error reading image for supply ID ${supply._id}:`, err);
                    supply.image_url = ''; // Si hay un error, asigna null
                }
            }
        }

        res.status(200).json(supplies);
    } catch (error) {
        console.error('Error fetching supplies:', error);
        res.status(500).send('Error fetching supplies');
    }
}

/**
 * @description Crear un suministro
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Supply
 */
async function createSupply(req, res) {
    try {

        const data = req.body;
        data.image_url = req.file ? req.file.filename : '';
        data.stock = 0;
        data.price = Number(data.price)
        const supplyData = new SupplySchema(data);

        // Validar los datos de entrada
        await defaultSchema.validateAsync(supplyData);

        const newSupply = new Supply(supplyData);
        await newSupply.save();
        res.status(201).json(newSupply);
    } catch (error) {
        console.error('Error al crear el suministro:', error);
        res.status(500).json({
            message: error.details ? error.details[0].message : 'Error al crear el suministro'
        });
    }
}

/**
 * @description Eliminar un suministro
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Supply
 */
async function deleteSupply(req, res) {
    try {
        const { id } = req.params;
        const result = await Supply.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ message: 'Suministro no encontrado' });
        }
        // Construir la ruta del archivo de la imagen
        const imagePath = path.join(__dirname, '..', 'resources', result.image_url); // Ajusta la ruta según tu estructura de carpetas

        try {
            // Verificar si el archivo existe y eliminarlo
            await fs.access(imagePath);  // Verifica si el archivo es accesible
            await fs.unlink(imagePath);  // Elimina el archivo
        } catch (err) {
            console.error('Imagen no encontrada:', err);
            // Si no se puede encontrar el archivo o tiene algún error, podemos continuar sin eliminar la imagen
        }

        //eliminar id de todos los productos
        await removeSupplyFromProducts(id);

        res.status(202).json(result);
    } catch (error) {
        console.error('Error al actualizar el suministro:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al eliminar el suministro');
    }
}

async function removeSupplyFromProducts(supplyId) {
    try {
        // Obtener todos los productos de la base de datos
        const products = await Product.find(); // O lo que sea necesario para obtener los productos

        // Recorrer cada producto
        for (const product of products) {
            // Filtrar los insumos del producto para remover el que tenga el mismo ID que el supplyId
            product.supplies = product.supplies.filter(supply => supply._id !== supplyId);

            // Guardar el producto actualizado
            await product.save();
        }

    } catch (error) {
        console.error("Error al eliminar el insumo de los productos", error);
        throw error;
    }
}

/**
 * @description Actualiza registro
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Supply
 */
async function updateSupply(req, res) {
    try {
        const { id } = req.params; // Obtener el ID del cuerpo de la solicitud
        const data = req.body;
        console.log(data);
        data.stock = Number(data.stock);
        data.price = Number(data.price);
        data.image_url = req.file ? req.file.filename : ''; // Si hay un archivo en la solicitud, asignar el nombre del archivo a la propiedad image_url

        const supplyData = new SupplySchema(data); // Crear una instancia de SupplySchema con los datos de la solicitud

        // Validar los datos de entrada
        await defaultSchema.validateAsync(supplyData);

        let updatedSupply;

        if (supplyData.haveStock === 'false') {
            supplyData.stock = 0;
            supplyData.price = 0;
        }

        if (supplyData.image_url === '') {
            updatedSupply = await Supply.findByIdAndUpdate(id, {
                name: supplyData.name,
                price: supplyData.price,
                haveStock: supplyData.haveStock,
                stock: supplyData.stock
            })
        } else {
            updatedSupply = await Supply.findByIdAndUpdate(id, supplyData);
        }

        if (!updatedSupply) {
            return res.status(404).json({ message: 'Suministro no encontrado' });
        }

        res.status(200).json(updatedSupply);
    } catch (error) {
        console.error('Error al actualizar el suministro:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al actualizar el suministro'); // Devolver error de validación o error genérico
    }
}

/**
 * @description Actualizar el stock de un suministro
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Supply
 */
async function updateStock(req, res) {
    try {
        const data = req.body;
        const { id } = req.params;
        const supplyData = new SupplySchema(data);
        await defaultSchema.validateAsync(supplyData);

        const supply = await Supply.findByIdAndUpdate(id, { stock: supplyData.stock });
        if (!supply) {
            return res.status(404).json({ message: 'Suministro no encontrado' });
        }
        res.status(200).json(supply);
    } catch (error) {
        console.log('Error al actualizar el stock:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al actualizar el stock');
    }
}

module.exports = {
    getSupplies,
    createSupply,
    deleteSupply,
    updateSupply,
    updateStock
};