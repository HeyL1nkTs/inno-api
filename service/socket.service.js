const { Server } = require('socket.io');

/**
 * @description Configura el servidor de Socket.IO
 * @param {object} server - Servidor HTTP de Express
 */
function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "*", // URL de tu app Angular
            methods: ["GET", "POST"],
        },
    });

    return io;
}

/**
 * @description Envía un evento con los datos de pago al cliente
 * @param {object} paymentInfo - Información del pago
 */
function emitPaymentInfo(io, paymentInfo) {
    if (io) {
        io.emit('paymentInfo', paymentInfo); // Envía el evento 'paymentInfo'
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

/**
 * @description Cierra la sesion de los usuarios al finalizar la venta
 */

function closeSession(socket) {
    if (socket) {
        socket.emit('closeSession');
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

/**
 * @description Si un admin cierra la caja avisa a los demas para cerrarla tambien, no importa que
 * admin sea, es una caja por session
 */
function closeAllCashiers(socket) {
    if (socket) {
        socket.emit('closeCashier', true);
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

function openAllCashier(socket, data) {
    if (socket) {
        socket.emit('openCashier', data);
    } else {
        console.error('Socket.IO no está inicializado');
    }
}

module.exports = {
    initializeSocket,
    emitPaymentInfo,
    closeSession,
    closeAllCashiers,
    openAllCashier
};
