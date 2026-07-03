const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let playlist = [];
let currentVideoId = 'jfKfPfyJRdk'; // Bài mặc định ban đầu

// MẬT KHẨU ADMIN CỦA ÔNG CHỦ Ở ĐÂY NHA 🫪
const ADMIN_PASSWORD = 'admin123';

io.on('connection', (socket) => {
    console.log('🔌 Một kết nối mới: ' + socket.id);

    // Xử lý khi người dùng điền tên và bấm vào phòng
    socket.on('joinRoom', (data) => {
        const { name, isAdmin, password } = data;
        const username = name.trim() || 'Người dùng ẩn danh';

        if (isAdmin) {
            // Xác thực mật khẩu admin
            if (password === ADMIN_PASSWORD) {
                socket.username = username + ' 😎 (Admin)';
                socket.role = 'admin';
                // Trả kết quả thành công về cho Admin
                socket.emit('authResult', { success: true, role: 'admin', currentVideoId, playlist });
                io.emit('newMessage', { name: 'Hệ thống 🤖', text: `👑 Admin [${socket.username}] đã lên sàn điều khiển nhạc!` });
            } else {
                // Trả kết quả thất bại nếu sai mật khẩu
                socket.emit('authResult', { success: false, message: 'Sai mật khẩu Admin rồi ông chủ ơi! ❌' });
            }
        } else {
            // Thành viên bình thường không cần mật khẩu
            socket.username = username;
            socket.role = 'member';
            socket.emit('authResult', { success: true, role: 'member', currentVideoId, playlist });

            // Thông báo cho cả phòng có người mới vào
            io.emit('newMessage', { name: 'Hệ thống 🤖', text: `👋 Chào mừng [${socket.username}] đã tham gia phòng nhạc!` });
        }
    });

    // --- LOGIC CHATBOX ---
    socket.on('sendMessage', (msg) => {
        if (msg.trim() !== '') {
            io.emit('newMessage', { name: socket.username || 'Ẩn danh', text: msg });
        }
    });

    // --- LOGIC PLAYLIST & ĐIỀU KHIỂN ---
    socket.on('requestSync', () => {
        // Yêu cầu admin gửi lại tiến độ video hiện tại
        socket.broadcast.emit('memberRequestSync');
    });

    socket.on('adminAddSong', (videoId) => {
        if (socket.role === 'admin') {
            playlist.push(videoId);
            io.emit('updatePlaylist', playlist);
        }
    });

    socket.on('adminNextSong', () => {
        if (socket.role === 'admin' && playlist.length > 0) {
            currentVideoId = playlist.shift();
            io.emit('changeVideo', currentVideoId);
            io.emit('updatePlaylist', playlist);
        }
    });

    socket.on('adminPlay', (time) => { if (socket.role === 'admin') socket.broadcast.emit('memberPlay', time); });
    socket.on('adminPause', () => { if (socket.role === 'admin') socket.broadcast.emit('memberPause'); });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('newMessage', { name: 'Hệ thống 🤖', text: `🏃‍♂️ [${socket.username}] đã rời phòng.` });
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 Trạm nhạc của ông chủ chạy tại http://localhost:3000');
});