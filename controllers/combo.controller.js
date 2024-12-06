const Product = require('../models/product');
const Combo = require('../models/combo');
const ComboSchema = require('../schemas/combo');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');

const defaultSchema = Joi.object({
    _id: Joi.string().allow(''),
    name: Joi.string().trim().required(),
    price: Joi.number().required(),
    image_url: Joi.string().allow(''),
    haveStock: Joi.boolean().required(),
    stock: Joi.number(),
    products: Joi.allow('')
});

async function createCombo(req, res){
    try{

        const data = req.body;
        data.image_url = req.file ? req.file.filename : '';
        data.stock = 0;
        data.price = Number(data.price)
        const comboData = new ComboSchema(data);

        if(comboData.products){
            comboData.products = JSON.parse(comboData.products);
        }

        await defaultSchema.validateAsync(comboData);

        const newCombo = new Combo(comboData);
        await newCombo.save();
        res.status(201).json(newCombo);

    } catch (error) {
        console.error('Error al crear el suministro:', error);
        res.status(500).json({
            message: error.details ? error.details[0].message : 'Error al crear el suministro'
        });
    }
}

async function getCombos(req, res) {
    try {
        const { id, name } = req.query;

        let combos;

        if (id) {
            combos = await Combo.findById(id);
            if (!combos) {
                return res.status(404).send('Suministro no encontrado');
            }
            combos = [combos]; // Convertimos a array para procesamiento uniforme
        } else if (name) {
            combos = await Combo.findOne({ name });
            if (!combos) {
                return res.status(404).send('Suministro no encontrado');
            }
            combos = [combos]; // Convertimos a array para procesamiento uniforme
        } else {
            combos = await Combo.find();
        }

        // Agrega la imagen en base64 a cada suministro usando un bucle for...of
        for (const combo of combos) {
            /*if (combo.image_url) {
                const imagePath = path.join(__dirname, '..', 'resources', combo.image_url);
                try {
                    const image = await fs.readFile(imagePath); // Lee la imagen del sistema de archivos
                    combo.image_url = `data:image/jpeg;base64,${image.toString('base64')}`; // Convierte a base64
                } catch (err) {
                    console.error(`Error reading image for combo ID ${combo._id}:`, err);
                    combo.image_url = ''; // Si hay un error, asigna null
                }
            }*/
           combo.image_url = await findPhotos(combo.image_url);
        }

        res.status(200).json(combos);
    } catch (error) {
        console.error('Error fetching combos:', error);
        res.status(500).send('Error fetching combos');
    }
}

async function updateCombo(req, res) {
    try {
        const data = req.body;
        data.stock = Number(data.stock);
        data.price = Number(data.price);
        data.image_url = req.file ? req.file.filename : '';
        const { id } = req.params;
        const comboData = new ComboSchema(data);

        if (comboData.products) {
            comboData.products = JSON.parse(comboData.products)
        }

        await defaultSchema.validateAsync(comboData);

        let updatedCombo

        if (_.isEmpty(comboData.image_url)) {
            updatedCombo = await Combo.findByIdAndUpdate(
                id,
                {
                    name: comboData.name,
                    price: comboData.price,
                    haveStock: comboData.haveStock,
                    stock: comboData.stock,
                    products: comboData.products
                },
                { new: true }  // Opciones para devolver el documento actualizado
            );
        } else {
            updatedCombo = await Combo.findByIdAndUpdate(id, comboData, { new: true });
        }

        if (!updatedCombo) {
            return res.status(404).json({ message: 'Suministro no encontrado' });
        }

        res.status(200).json(updatedCombo);
    } catch (error) {
        console.log('Error al actualizar :', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al actualizar');
    }
}

async function deleteCombo(req, res) {
    try {
        const { id } = req.params;
        const deletedCombo = await Combo.findByIdAndDelete(id);

        if (!deletedCombo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        const imagePath = path.join(__dirname, '..', 'resources', deletedCombo.image_url); // Ajusta la ruta según tu estructura de carpetas

        try {
            // Verificar si el archivo existe y eliminarlo
            await fs.access(imagePath);  // Verifica si el archivo es accesible
            await fs.unlink(imagePath);  // Elimina el archivo
        } catch (err) {
            console.error('Imagen no encontrada:', err);
            // Si no se puede encontrar el archivo o tiene algún error, podemos continuar sin eliminar la imagen
        }

        //return stock to products

        const prodRequired = 1;

        for (const product of deletedCombo.products) {
            const foundProduct = await Product.findById(product._id);

            if (!foundProduct) {
                throw new Error(`ID ${product._id} not found in supplies`);
            }

            if (!foundProduct.haveStock) {
                continue;
            }

            foundProduct.stock = foundProduct.stock + (prodRequired * deletedCombo.stock);

            await foundProduct.save();
        }

        res.status(200).json(deletedCombo);
    } catch (error) {
        console.error('Error deleting Combo:', error);
        res.status(500).json({ message: 'Error deleting Combo' });
    }
}

async function updateStock(req, res) {
    let errorMessages = [];

    try {
        const data = req.body;
        const { id } = req.params;
        const comboData = new ComboSchema(data);

        // Validar el Comboo con el schema
        await defaultSchema.validateAsync(comboData);

        // Asegurarse de que supplies es un array de objetos
        if (comboData.products && typeof comboData.products === 'string') {
            comboData.products = JSON.parse(comboData.products);
        }

        const comboStockToUpdate = await Combo.findById(id);

        if (!comboStockToUpdate) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        const comboToCreate = comboData.stock;
        const comboRequired = 1;

        // Actualizar el stock de los insumos
        for (const product of comboData.products) {

            const productId = product._id;

            const foundProd = await Product.findById(productId);

            if (!foundProd) {
                throw new Error(`ID ${productId} not found in products`);
            }

            if (!foundProd.haveStock) {
                continue;
            }

            const productStock = foundProd.stock; // 2
            const requiredStock = comboRequired * comboToCreate; // 1 * 2 = 2 // cuanto requiere la unidad * cantidad de producto

            if (requiredStock < 0) {
                //returns required stock to product inventory

                foundProd.stock = foundProd.stock - requiredStock; // 3 - -1 = 4

                if (foundProd.stock < 0) {
                    errorMessages.push(`You can't have negative stock for ${foundProd.name}.`);
                    continue;
                }

                await foundProd.save();

                continue;
            }

            // Si el stock es mayor que lo requerido, usamos la cantidad requerida, si no, usamos todo el stock
            foundProd.stock = productStock - requiredStock; //eje 2 - 2 = 0

            if (foundProd.stock < 0) {
                errorMessages.push(`Not enough stock for ${foundProd.name}, ${productStock} found in stock and you need at least ${comboRequired* comboData.stock}.`);
                continue;
            }

            if (errorMessages.length === 0) {
                // Guardar el cambio en el stock del insumo
                await foundProd.save();
            }
        }

        if (errorMessages.length > 0) {
            // Unir los mensajes con saltos de línea para mostrar en texto plano
            return res.status(400).json({
                message: errorMessages.join('\n') // Unir con saltos de línea de texto plano
            });
        }

        comboData.stock = comboStockToUpdate.stock + comboData.stock;

        // Actualizar el stock del producto con la cantidad real que se puede crear
        const combo = await Combo.findByIdAndUpdate(id, { stock: comboData.stock }, { new: true });

        if (!combo) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Si todo fue correcto y se utilizó la cantidad completa, respondemos normalmente
        res.status(200).json({
            message: 'Product stock updated',
            product: combo
        });

    } catch (error) {
        console.log('Error updating stock:', error);
        res.status(400).json({ message: error.message || 'Error updating stock' });
    }
}

async function getCombosWithProductsAssosiated(req, res) {
    try{
        const combos = await Combo.find();

        const result = [];

        for (const combo of combos) {
            combo.image_url = await findPhotos(combo.image_url);

            const isAvailable = combo.stock > 0 ? true : false;

            result.push({
                id: combo._id,
                name: combo.name,
                price: combo.price,
                image_url: combo.image_url,
                stock: combo.stock,
                isAvailable: isAvailable,
                products: combo.products
            })
        }

        res.status(200).send(result);
    } catch (error) {
        console.error('Error fetching combos:', error);
        res.status(500).send('Error fetching combos');
    }
}

async function findPhotos(image_url){
    if (image_url) {
        const imagePath = path.join(__dirname, '..', 'resources', combo.image_url);
        try {
            const image = await fs.readFile(imagePath); // Lee la imagen del sistema de archivos
            image_url = `data:image/jpeg;base64,${image.toString('base64')}`; // Convierte a base64
        } catch (err) {
            console.error(`Error reading image for combo ID ${combo._id}:`, err);
            image_url = ''; // Si hay un error, asigna null
        }
    }

    return image_url;
}

module.exports = {
    createCombo,
    getCombos,
    updateCombo,
    deleteCombo,
    updateStock,
    getCombosWithProductsAssosiated
}
