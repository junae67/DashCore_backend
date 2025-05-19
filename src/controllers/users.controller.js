const fs = require('fs');
const path = require('path');
const { validateUser } = require('../utils/validation');

const usersFilePath = path.resolve(__dirname, '../data/users.json');

exports.readDynamics = (req, res) => {
    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'error conexion de datos.' });
        }
        const users = JSON.parse(data);
        res.json(users);
    });
};

exports.sendDynamics = (req, res) => {
    const newUser = req.body;

    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'error conexion de datos.' });
        }

        const users = JSON.parse(data);

        // Validar nuevo usuario (POST)
        const validation = validateUser(newUser, users);

        if (!validation.isValid) {
            return res.status(400).json({ errors: validation.errors });
        }

        users.push(newUser);

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al guardar el usuario' });
            }
            res.status(201).json(newUser);
        });
    });
};

exports.editDynamics = (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const updateUser = req.body;

    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'error conexion de datos.' });
        }

        let users = JSON.parse(data);

        const existingUser = users.find(user => user.id === userId);
        if (!existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Validar datos actualizados (PUT) 
        // Aquí pasamos la lista de usuarios SIN validar ID único, porque estamos editando
        const validation = validateUser({ ...existingUser, ...updateUser }, users.filter(u => u.id !== userId));

        if (!validation.isValid) {
            return res.status(400).json({ errors: validation.errors });
        }

        users = users.map(user =>
            user.id === userId ? { ...user, ...updateUser } : user
        );

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar el usuario' });
            }
            res.json({ message: 'Usuario actualizado', updatedUser: { ...existingUser, ...updateUser } });
        });
    });
};

exports.deleteDynamics = (req, res) =>{
    const userId = parseInt(req.params.id, 10);
    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if(err){
            return res.status(500).json({ error: 'Error al actualizar el usuario' });
        }

        let users = JSON.parse(data);
        users = users.filter(user => user.id !== userId );
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err){
                return res.status(500).json({ error: 'Error al eliminar usuarios' });
            }
            res.status(204).send();
        });

    });
};
