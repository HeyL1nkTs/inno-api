const User = require('../models/user');
const Cashier = require('../models/cashier');
const Session = require('../models/session');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('../service/jwt.service')
const _ = require('lodash');
const { closeSession } = require('../service/socket.service');

const defaultSchema = Joi.object({
    _id: Joi.string().allow(''),
    name: Joi.string().trim().required(),
    password: Joi.string().required(),
    phone: Joi.string().allow(''),
    email: Joi.string().allow(''),
    role: Joi.string().allow('')
});

async function initSesion(req, res) {
    try {
        const { username, password } = req.body;

        const foundUser = await User.findOne({ username: username });

        if (!foundUser) {
            return res.status(404).send({ message: 'Usuario no encontrado' });
        }

        const isPasswordValid = await verifyPassword(password, foundUser.password);

        if (!isPasswordValid) {
            return res.status(401).send({ message: 'Contraseña incorrecta' });
        }

        //una vez verificado, registrar usario logeado en una tabla de sesion para evitar sesiones repetidas e inconsistencias
        const session = await Session.findOne({ userId: foundUser._id });

        if(session){
            return res.status(401).send({ message: 'El usuario ya tiene una sesion en otro equipo' });
        }

        if (foundUser.role === 'seller') { //check if is seller
            const openCashier = await Cashier.findOne({ status: 'open' });

            if (!openCashier) {
                return res.status(401).send({ message: 'Aun no inicia la caja el administrador!' });
            }
        }

        const newSession = await Session.create({
            userId: foundUser._id,
            role: foundUser.role
        });

        const token = jwt.generateToken({
            _id: foundUser._id,
            name: foundUser.name,
            email: foundUser.email,
            phone: foundUser.phone,
            role: foundUser.role,
            sessionId: newSession._id
        });

        res.status(200).send({ token: token });
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).send('Error login');
    }
}

async function closeUserSession(req, res) {
    try {
        const { id } = req.params;
        await Session.findByIdAndDelete(id);
        closeSession();
        await Cashier.deleteMany({ status: 'open' }); //elimina todas las open
        res.status(200).send({ message: 'Sesión cerrada' });
    } catch (error) {
        console.error('Error closing session:', error);
        res.status(500).send('Error closing session');
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

async function updateUserMain(req, res) {
    try {
        const { id } = req.params;
        const { name, password, phone, email, role } = req.body;

        if (!id) {
            return res.status(400).send({ message: 'ID de usuario no proporcionado' });
        }

        let updatedUser;

        if (!_.isEmpty(name) || !_.isNil(name)) {
            updatedUser = await User.findByIdAndUpdate(id, { name: name });
            return res.status(200).send(updatedUser);
        }

        if (!_.isEmpty(password) || !_.isNil(password)) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedUser = await User.findByIdAndUpdate(id, { password: hashedPassword });
            return res.status(200).send(updatedUser);
        }

        if (!_.isEmpty(phone) || !_.isNil(phone)) {
            updatedUser = await User.findByIdAndUpdate(id, { phone: phone });
            return res.status(200).send(updatedUser);
        }

        if (!_.isEmpty(email) || !_.isNil(email)) {
            updatedUser = await User.findByIdAndUpdate(id, { email: email });
            return res.status(200).send(updatedUser);
        }

        if (!_.isEmpty(role) || !_.isNil(role)) {
            updatedUser = await User.findByIdAndUpdate(id, { role: role });
            return res.status(200).send(updatedUser);
        }

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user');
    }
}

async function getUsers(req, res) {
    try {
        const { id } = req.params;

        // Obtener todos los usuarios menos el admin y el propio usuario
        const users = await User.find({
            name: { $ne: 'admin' },   // Excluir al usuario con nombre "admin"
            _id: { $ne: id }           // Excluir al usuario cuyo ID es el mismo que el proporcionado
        }).select('-password');         // No incluir el campo password en la respuesta

        res.status(200).send(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).send('Error getting users');
    }
}

async function addUser(req, res) {
    try {
        const { name, username, password, phone, email, role } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword,
            phone: phone,
            email: email,
            role: role
        });

        await newUser.save();

        res.status(201).send(newUser);
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Error adding user');
    }
}

async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.status(200).send({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
}

async function editUser(req, res) {
    try {
        const { id } = req.params;
        const { name, username, password, phone, email, role } = req.body;

        const updatedUser = await User.findByIdAndUpdate(id, {
            name: name,
            username: username,
            password: password,
            phone: phone,
            email: email,
            role: role
        });

        res.status(200).send(updatedUser);
    } catch (error) {
        console.error('Error editing user:', error);
        res.status(500).send('Error editing user');
    }
}

module.exports = {
    initSesion,
    updateUserMain,
    getUsers,
    addUser,
    deleteUser,
    editUser,
    closeUserSession
}
