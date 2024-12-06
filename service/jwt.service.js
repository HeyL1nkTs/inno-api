const jwt = require('jsonwebtoken');

class JwtService {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your_secret_key'; // Clave secreta
        this.expiresIn = process.env.JWT_EXPIRES_IN || '1h'; // Tiempo de expiración
    }

    /**
     * @description Generates a JWT token with the given payload.
     * @param {object} payload - The data to include in the token.
     * @returns {string} - The generated token.
     */
    generateToken(payload) {
        return jwt.sign(payload, this.secretKey, { expiresIn: this.expiresIn });
    }

    /**
     * @description Middleware to verify the JWT token in the request headers.
     * @param {object} req - Express request object.
     * @param {object} res - Express response object.
     * @param {function} next - Express next middleware function.
     */
    verifyTokenMiddleware(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header
        if (!token) {
            return res.status(401).json({ message: 'Token not provided' });
        }

        try {
            const decoded = jwt.verify(token, this.secretKey);
            req.user = decoded; // Attach decoded payload to the request object
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    }

    /**
     * @description Decodes a JWT token and returns its payload.
     * @param {string} token - The JWT token to decode.
     * @returns {object|null} - The decoded payload or null if the token is invalid.
     */
    getPayload(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }
}

module.exports = new JwtService();
