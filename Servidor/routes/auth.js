const { Router } = require('express');
const { check } = require('express-validator');

const { login } = require('../controllers/auth');

const router = Router();

router.post('/login', [
    // Aquí se podrían agregar validaciones con express-validator si estuviera instalado
    // check('correo', 'El correo es obligatorio').isEmail(),
    // check('password', 'La contraseña es obligatoria').not().isEmpty(),
], login );

module.exports = router;
