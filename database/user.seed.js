const User = require('../models/user');

const seedUsers = async () => {
    const users = [
        {
            name: 'Admin Master',
            username: 'admin',
            password: '$2a$12$SyGLFJJnoh2MNpXsNdXQTe.1.jUhQPhIkxZCITkShT0V28N8IQB1i', //root
            phone: '123456789',
            role: 'admin',
            email: 'admin@mail.com'
        },
        {
            name: 'User Default',
            username: 'user',
            password: '$2a$12$3jF/PaMJPU3wiMytSKH7aePYFIE3W0DDtAF5SfOONmEmI6CFpouQa', //12345
            phone: '987654321',
            role: 'seller',
            email: 'default@mail.com'
        },
    ];

    try {
        const existingUsers = await User.find();
        if (existingUsers.length === 0) {
            await User.insertMany(users);
            console.log('Usuarios insertados');
        } else {
            console.log('Ya existen usuarios en la base de datos');
        }
    } catch (error) {
        console.error('Error al insertar los usuarios:', error);
    }
};

module.exports = seedUsers;