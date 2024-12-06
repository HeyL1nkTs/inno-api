const Product = require('../models/product');
const Supply = require('../models/supply');
const Extras = require('../models/extra');
const ProductSchema = require('../schemas/product');
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
    supplies: Joi.allow('')
});

async function getProducts(req, res) {
    try {
        const { id, name } = req.query;

        let products;

        if (id) {
            products = await Product.findById(id);
            if (!products) {
                return res.status(404).send('Suministro no encontrado');
            }
            products = [products]; // Convertimos a array para procesamiento uniforme
        } else if (name) {
            products = await Product.findOne({ name });
            if (!products) {
                return res.status(404).send('Suministro no encontrado');
            }
            products = [products]; // Convertimos a array para procesamiento uniforme
        } else {
            products = await Product.find();
        }

        // Agrega la imagen en base64 a cada suministro usando un bucle for...of
        for (const product of products) {
            /*if (product.image_url) {
                const imagePath = path.join(__dirname, '..', 'resources', product.image_url);
                try {
                    const image = await fs.readFile(imagePath); // Lee la imagen del sistema de archivos
                    product.image_url = `data:image/jpeg;base64,${image.toString('base64')}`; // Convierte a base64
                } catch (err) {
                    console.error(`Error reading image for Product ID ${product._id}:`, err);
                    product.image_url = ''; // Si hay un error, asigna null
                }
            }*/

            product.image_url = await findImages(product.image_url);
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
}

async function updateProduct(req, res) {
    try {
        const data = req.body;
        data.stock = Number(data.stock);
        data.price = Number(data.price);
        data.image_url = req.file ? req.file.filename : '';
        const { id } = req.params;
        const productData = new ProductSchema(data);

        if (productData.supplies) {
            productData.supplies = JSON.parse(productData.supplies)
        }

        await defaultSchema.validateAsync(productData);

        let updatedProduct

        if (_.isEmpty(productData.image_url)) {
            updatedProduct = await Product.findByIdAndUpdate(
                id,
                {
                    name: productData.name,
                    price: productData.price,
                    haveStock: productData.haveStock,
                    stock: productData.stock,
                    supplies: productData.supplies
                },
                { new: true }  // Opciones para devolver el documento actualizado
            );
        } else {
            updatedProduct = await Product.findByIdAndUpdate(id, productData, { new: true });
        }

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Suministro no encontrado' });
        }

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.log('Error al actualizar:', error);
        res.status(400).send(error.details ? error.details[0].message : 'Error al actualizar');
    }
}

async function createProduct(req, res) {
    try {
        const data = req.body;
        data.image_url = req.file ? req.file.filename : '';
        data.stock = 0;
        data.price = Number(data.price)
        const productData = new ProductSchema(data);

        if (productData.supplies) {
            productData.supplies = JSON.parse(productData.supplies)
        }

        // Validar los datos de entrada
        await defaultSchema.validateAsync(productData);

        const newProduct = new Product(productData);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error al crear el suministro:', error);
        res.status(500).json({
            message: error.details ? error.details[0].message : 'Error al crear el suministro'
        });
    }
}

/**
 * @description Actualizar el stock de un suministro
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 * @returns Product
 */
async function updateStock(req, res) {
    let errorMessages = [];

    try {
        const data = req.body;
        const { id } = req.params;
        const productData = new ProductSchema(data);

        // Validar el producto con el schema
        await defaultSchema.validateAsync(productData);

        // Asegurarse de que supplies es un array de objetos
        if (productData.supplies && typeof productData.supplies === 'string') {
            productData.supplies = JSON.parse(productData.supplies);
        }

        const productStockToUpdate = await Product.findById(id);

        if (!productStockToUpdate) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const productsToCreate = productData.stock;

        // Actualizar el stock de los insumos
        for (const supply of productData.supplies) {

            const supplyId = supply._id;

            const foundSupply = await Supply.findById(supplyId);

            if (!foundSupply) {
                throw new Error(`ID ${supplyId} not found in supplies`);
            }

            if (!foundSupply.haveStock) {
                continue;
            }

            const supplyStock = foundSupply.stock; // 0
            const requiredStock = supply.required * productsToCreate; // 1 * -2 = -2 // cuanto requiere la unidad * cantidad de producto

            if (requiredStock < 0) {
                //returns required stock to supply inventory

                foundSupply.stock = foundSupply.stock - requiredStock; // 0 - -2 = 2

                if (foundSupply.stock < 0) {
                    errorMessages.push(`You can't have negative stock for ${foundSupply.name}.`);
                    continue;
                }

                await foundSupply.save();

                continue;
            }

            // Si el stock es mayor que lo requerido, usamos la cantidad requerida, si no, usamos todo el stock
            foundSupply.stock = supplyStock - requiredStock; //eje 3 - 5 = 0

            if (foundSupply.stock < 0) {
                errorMessages.push(`Not enough stock for ${foundSupply.name}, ${supplyStock} found in stock and you need ${supply.required * productData.stock}.`);
                continue;
            }

            if (errorMessages.length === 0) {
                // Guardar el cambio en el stock del insumo
                await foundSupply.save();
            }
        }

        if (errorMessages.length > 0) {
            // Unir los mensajes con saltos de línea para mostrar en texto plano
            return res.status(400).json({
                message: errorMessages.join('\n') // Unir con saltos de línea de texto plano
            });
        }

        productData.stock = productStockToUpdate.stock + productData.stock;

        // Actualizar el stock del producto con la cantidad real que se puede crear
        const product = await Product.findByIdAndUpdate(id, { stock: productData.stock }, { new: true });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Si todo fue correcto y se utilizó la cantidad completa, respondemos normalmente
        res.status(200).json({
            message: 'Product stock updated',
            product: product
        });

    } catch (error) {
        console.log('Error updating stock:', error);
        res.status(400).json({ message: error.message || 'Error updating stock' });
    }
}

async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const imagePath = path.join(__dirname, '..', 'resources', deletedProduct.image_url); // Ajusta la ruta según tu estructura de carpetas

        try {
            // Verificar si el archivo existe y eliminarlo
            await fs.access(imagePath);  // Verifica si el archivo es accesible
            await fs.unlink(imagePath);  // Elimina el archivo
        } catch (err) {
            console.error('Imagen no encontrada:', err);
            // Si no se puede encontrar el archivo o tiene algún error, podemos continuar sin eliminar la imagen
        }

        //return stock to supplies

        for (const supply of deletedProduct.supplies) {
            const foundSupply = await Supply.findById(supply._id);

            if (!foundSupply) {
                throw new Error(`ID ${supply._id} not found in supplies`);
            }

            if (!foundSupply.haveStock) {
                continue;
            }

            foundSupply.stock = foundSupply.stock + (supply.required * deletedProduct.stock);

            await foundSupply.save();
        }

        res.status(200).json(deletedProduct);
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
}

/**
 * @description Obtener los productos con los extras relacionados y el precio de los suministros
 * @param {Request} req - Solicitud HTTP
 * @param {Response} res - Respuesta HTTP
 */
async function getProductsWithExtrasRelationated(req, res) {
    try {
        // Obtener todos los productos
        const products = await Product.find();

        const result = [];

        // Iterar sobre cada producto y buscar los extras relacionados
        for (const product of products) {

            product.image_url = findImages(product.image_url);

            // Buscar extras que contienen este producto
            const relatedExtras = await Extras.find({
                "products._id": product.id // Buscamos el producto por su id dentro del campo '_id' de los objetos en 'products'
            }).select('id name price');

            // Crear una lista para los suministros con el precio
            const suppliesWithPrice = [];

            // Iterar sobre cada supply en el array 'supplies' del producto
            for (const supply of product.supplies) {
                const supplyDetails = await Supply.findById(supply._id).select('price'); // Buscar el precio del suministro
                suppliesWithPrice.push({
                    _id: supply._id,
                    name: supply.name,
                    requiredQuantity: supply.required,
                    price: supplyDetails ? supplyDetails.price : null // Agregar el precio encontrado
                });
            }

            const isAvailable = product.stock > 0 ? true : false;


            // Agregar el producto con los extras y los suministros con precios
            result.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                stock: product.stock,
                isAvailable: isAvailable,
                extrasRelacionados: relatedExtras.map(extra => ({
                    id: extra.id,
                    name: extra.name,
                    price: extra.price
                })),
                supplies: suppliesWithPrice // Aquí agregamos los suministros con los precios
            });
        }

        res.status(200).send(result);
    } catch (error) {
        console.error('Error al obtener los productos con extras:', error);
    }
}

async function findImages(image_url) {
    if (image_url) {
        const imagePath = path.join(__dirname, '..', 'resources', product.image_url);
        try {
            const image = await fs.readFile(imagePath); // Lee la imagen del sistema de archivos
            product.image_url = `data:image/jpeg;base64,${image.toString('base64')}`; // Convierte a base64
        } catch (err) {
            console.error(`Error reading image for Product ID ${product._id}:`, err);
            product.image_url = ''; // Si hay un error, asigna null
        }
    }

    return image_url;
}



module.exports = {
    getProducts,
    createProduct,
    updateStock,
    updateProduct,
    deleteProduct,
    getProductsWithExtrasRelationated
}