const Extra = require('../models/extra');
const Joi = require('joi');

const defaultSchema = Joi.object({
    _id: Joi.string().allow(''),
    name: Joi.string().trim().required(),
    price: Joi.number().required(),
    products: Joi.string().required()
});

async function getExtras(req, res) {
    try {
        const extras = await Extra.find();
        res.status(200).json(extras);
    } catch (error) {
        console.error('Error getting extras:', error);
        res.status(500).send('Error getting extras');
    }
}

async function createExtra(req, res) {
    try {
        const { error } = defaultSchema.validate(req.body);

        if (error) {
            return res.status(400).send(error.details[0].message);
        }

        const data = req.body;
        data.products = JSON.parse(data.products);

        const extra = new Extra(data);
        await extra.save();
        res.status(201).json(extra);
    } catch (error) {
        console.error('Error creating extra:', error);
        res.status(500).send('Error creating extra');
    }
}

async function deleteExtra(req, res) {
    try {
        const { id } = req.params;
        const extra = await Extra.findByIdAndDelete(id);

        if (!extra) {
            return res.status(404).send('Extra not found');
        }

        res.status(200).json(extra);
    } catch (error) {
        console.error('Error deleting extra:', error);
        res.status(500).send('Error deleting extra');
    }
}

async function updateExtra(req, res) {
    try {
        const { id } = req.params;
        const { error } = defaultSchema.validate(req.body);

        if (error) {
            return res.status(400).send(error.details[0].message);
        }

        const data = req.body;
        data.products = JSON.parse(data.products);

        const extra = await Extra.findByIdAndUpdate(id, data, { new: true });

        if (!extra) {
            return res.status(404).send('Extra not found');
        }

        res.status(200).json(extra);
    } catch (error) {
        console.error('Error updating extra:', error);
        res.status(500).send('Error updating extra');
    }
}

module.exports = {
    getExtras,
    createExtra,
    deleteExtra,
    updateExtra
};