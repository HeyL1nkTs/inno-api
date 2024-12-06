const express = require('express');
const multer = require('multer');
const router = express.Router();
const supplyController = require('../controllers/supply.controller');
const productController = require('../controllers/product.controller');
const comboController = require('../controllers/combo.controller');
const extraController = require('../controllers/extra.controller');
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

//supplies
router.post('/supplies', upload.single('image_url'), supplyController.createSupply);
router.put('/supplies/:id', upload.single('image_url'), supplyController.updateSupply);

//product
router.post('/products', upload.single('image_url'), productController.createProduct);
router.put('/products/:id', upload.single('image_url'), productController.updateProduct);

//combo
router.post('/combos', upload.single('image_url'), comboController.createCombo);
router.put('/combos/:id', upload.single('image_url'), comboController.updateCombo);

// Middleware para parsear el cuerpo de la solicitud a JSON
router.use(express.json());

//supplies
router.get('/supplies', supplyController.getSupplies);
router.delete('/supplies/:id', supplyController.deleteSupply);
router.put('/supplies/stock/:id', supplyController.updateStock);
//product
router.put('/products/stock/:id', productController.updateStock);
router.delete('/products/:id', productController.deleteProduct);
router.get('/products', productController.getProducts);
//combo
router.get('/combos', comboController.getCombos);
router.delete('/combos/:id', comboController.deleteCombo);
router.put('/combos/stock/:id', comboController.updateStock);
//extras
router.get('/extras', extraController.getExtras);
router.delete('/extras/:id', extraController.deleteExtra);
router.put('/extras/:id', extraController.updateExtra);
router.post('/extras', extraController.createExtra);

//lineal
router.get('/products/client', productController.getProductsWithExtrasRelationated)
router.get('/combos/client', comboController.getCombosWithProductsAssosiated)

module.exports = router;
