const express = require('express');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', socket => {
    socket.on('broadcaster', () => {
        socket.broadcast.emit('broadcaster', socket.id);
    });

    socket.on('watcher', id => {
        socket.to(id).emit('watcher', socket.id);
    });

    socket.on("offer", (id, message) => {
        socket.to(id).emit("offer", socket.id, message);
    });

    socket.on("answer", (id, message) => {
        socket.to(id).emit("answer", socket.id, message);
    });

    socket.on("candidate", (id, message) => {
        socket.to(id).emit("candidate", socket.id, message);
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('disconnected', socket.id);
    });
});

server.listen(8080, () => console.log('listen at 8080'));
