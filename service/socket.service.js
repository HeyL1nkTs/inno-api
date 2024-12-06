const { Server } = require('socket.io');

let io = null;

/**
 * @description Configura el servidor de Socket.IO
 * @param {object} server - Servidor HTTP de Express
 */
function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*", // URL de tu app Angular
            methods: ["GET", "POST"],
        },
    });

    io.on('connection', (socket) => {
        console.log('A client connected:', socket.id);

        // Evento para desconexión
        socket.on('disconnect', () => {
            console.log('A client disconnected:', socket.id);
        });
    });
}

/**
 * @description Envía un evento con los datos de pago al cliente
 * @param {object} paymentInfo - Información del pago
 */
function emitPaymentInfo(paymentInfo) {
    if (io) {
        io.emit('paymentInfo', paymentInfo); // Envía el evento 'paymentInfo'
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

/**
 * @description Cierra la sesion de los usuarios al finalizar la venta
 */

function closeSession() {
    if (io) {
        io.emit('closeSession');
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

module.exports = {
    initializeSocket,
    emitPaymentInfo,
    closeSession
};
