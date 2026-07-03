const io = require('socket.io-client');
const socket = io('https://music-live-ixwu.onrender.com');

socket.on('connect', () => {
    console.log('Connected');
    socket.emit('joinRoom', { name: 'test', isAdmin: false, password: '' });
});

socket.on('authResult', (res) => {
    console.log('Auth result:', res);
    process.exit(0);
});

setTimeout(() => {
    console.log('Timeout');
    process.exit(1);
}, 5000);
