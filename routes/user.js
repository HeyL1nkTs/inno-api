const userController = require('../controllers/user.controller');
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configuración de multer para guardar las imágenes en la carpeta resources
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'resources'); // Carpeta donde se guardarán las imágenes
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); // Nombre único para cada archivo
    }
});

// Solo acepta archivos con extensión jpeg, jpg o png
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.use(express.json());

router.post('/login', userController.initSesion);
router.put('/user/main/:id', userController.updateUserMain);
router.get('/user/:id', userController.getUsers);
router.post('/user', userController.addUser);
router.delete('/user/:id', userController.deleteUser);
router.put('/user/:id', userController.editUser);

router.post('/logout', userController.closeUserSession);

module.exports = router;