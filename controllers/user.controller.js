const User = require('../models/user');
const Cashier = require('../models/cashier');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('../service/jwt.service')
const _ = require('lodash');

const defaultSchema = Joi.object({
    _id: Joi.string().allow(''),
    name: Joi.string().trim().required(),
    password: Joi.string().required(),
    phone: Joi.string().allow(''),
    email: Joi.string().allow(''),
    role: Joi.string().allow('')
});

async function initSesion(req, res){
    try {
        const {name, password} = req.body;

        const foundUser = await User.findOne({name: name});

        if(!foundUser){
            return res.status(404).send({message: 'Usuario no encontrado'});
        }

        const isPasswordValid = await verifyPassword(password, foundUser.password);

        if(!isPasswordValid){
            return res.status(401).send({message: 'Contraseña incorrecta'});
        }

        if(foundUser.role === 'seller'){ //check if is seller
            const openCashier = await Cashier.findOne({status: 'open'});

            if(!openCashier){
                return res.status(401).send({message: 'Aun no inicia la caja el administrador!'});
            }
        }

        const token = jwt.generateToken({
            _id: foundUser._id,
            name: foundUser.name,
            email: foundUser.email,
            phone: foundUser.phone,
            role: foundUser.role});

        res.status(200).send({token: token});
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).send('Error login');
    }
}

/**
 * Verifica si la contraseña proporcionada coincide con la almacenada.
 * @param {string} plainPassword - Contraseña en texto plano ingresada por el usuario.
 * @param {string} hashedPassword - Contraseña cifrada almacenada en la base de datos.
 * @returns {Promise<boolean>} - Devuelve true si coinciden, false si no.
 */
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        console.error('Error verifying password:', error);
        throw new Error('Error verifying password');
    }
}

async function updateUserMain(req, res){
    try{
        const { id } = req.params;
        const { name, password, phone, email, role } = req.body;

        if(!id){
            return res.status(400).send({message: 'ID de usuario no proporcionado'});
        }

        let updatedUser;

        if(!_.isEmpty(name) || !_.isNil(name)){
            updatedUser = await User.findByIdAndUpdate(id, {name: name});
            return res.status(200).send(updatedUser);
        }

        if(!_.isEmpty(password) || !_.isNil(password)){
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedUser = await User.findByIdAndUpdate(id, {password: hashedPassword});
            return res.status(200).send(updatedUser);
        }

        if(!_.isEmpty(phone) || !_.isNil(phone)){
            updatedUser = await User.findByIdAndUpdate(id, {phone: phone});
            return res.status(200).send(updatedUser);
        }

        if(!_.isEmpty(email) || !_.isNil(email)){
            updatedUser = await User.findByIdAndUpdate(id, {email: email});
            return res.status(200).send(updatedUser);
        }

        if(!_.isEmpty(role) || !_.isNil(role)){
            updatedUser = await User.findByIdAndUpdate(id, {role: role});
            return res.status(200).send(updatedUser);
        }

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user');
    }
}

module.exports = {
    initSesion,
    updateUserMain
}
