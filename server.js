const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let playlist = [];
let currentVideoId = 'jfKfPfyJRdk'; // Bài mặc định ban đầu
let pinnedMessage = null;

// MẬT KHẨU ADMIN CỦA ÔNG CHỦ Ở ĐÂY NHA 🫪
const ADMIN_PASSWORD = 'admin123';

function getYoutubeInfo(videoId) {
    return new Promise((resolve) => {
        https.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ id: videoId, title: parsed.title, thumbnail: parsed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` });
                } catch {
                    resolve({ id: videoId, title: 'Video ' + videoId, thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` });
                }
            });
        }).on('error', () => resolve({ id: videoId, title: 'Video ' + videoId, thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }));
    });
}

io.on('connection', (socket) => {
    console.log('🔌 Một kết nối mới: ' + socket.id);
    io.emit('viewersUpdate', io.engine.clientsCount);

    socket.on('joinRoom', (data) => {
        const { name, isAdmin, password } = data;
        const username = name.trim() || 'Người dùng ẩn danh';

        if (isAdmin) {
            if (password === ADMIN_PASSWORD) {
                socket.username = username + ' 😎 (Admin)';
                socket.role = 'admin';
                socket.emit('authResult', { success: true, role: 'admin', currentVideoId, playlist, pinnedMessage });
                io.emit('newMessage', { id: 'sys-'+Date.now(), name: 'Hệ thống 🤖', text: `👑 Admin [${socket.username}] đã lên sàn điều khiển nhạc!`, role: 'system' });
            } else {
                socket.emit('authResult', { success: false, message: 'Sai mật khẩu Admin rồi ông chủ ơi! ❌' });
            }
        } else {
            socket.username = username;
            socket.role = 'member';
            socket.emit('authResult', { success: true, role: 'member', currentVideoId, playlist, pinnedMessage });
            io.emit('newMessage', { id: 'sys-'+Date.now(), name: 'Hệ thống 🤖', text: `👋 Chào mừng [${socket.username}] đã tham gia phòng nhạc!`, role: 'system' });
        }
    });

    // --- LOGIC CHATBOX ---
    socket.on('sendMessage', (msg) => {
        if (msg.trim() !== '') {
            io.emit('newMessage', { 
                id: Date.now() + '-' + Math.random().toString(36).substr(2,9), 
                senderId: socket.id,
                name: socket.username || 'Ẩn danh', 
                text: msg, 
                role: socket.role || 'member' 
            });
        }
    });

    // --- ADMIN CHAT TOOLS ---
    socket.on('adminPinMessage', (msgObj) => {
        if (socket.role === 'admin') {
            pinnedMessage = msgObj;
            io.emit('updatePinnedMessage', pinnedMessage);
        }
    });
    
    socket.on('adminUnpinMessage', () => {
        if (socket.role === 'admin') {
            pinnedMessage = null;
            io.emit('updatePinnedMessage', null);
        }
    });
    
    socket.on('adminDeleteMessage', (msgId) => {
        if (socket.role === 'admin') {
            io.emit('messageDeleted', msgId);
        }
    });

    // --- LOGIC PLAYLIST & ĐIỀU KHIỂN ---
    socket.on('requestSync', () => {
        socket.broadcast.emit('memberRequestSync');
    });

    socket.on('adminAddSong', async (videoId) => {
        if (socket.role === 'admin') {
            const info = await getYoutubeInfo(videoId);
            playlist.push(info);
            io.emit('updatePlaylist', playlist);
        }
    });

    socket.on('adminRemoveSong', (index) => {
        if (socket.role === 'admin') {
            playlist.splice(index, 1);
            io.emit('updatePlaylist', playlist);
        }
    });

    socket.on('adminNextSong', () => {
        if (socket.role === 'admin' && playlist.length > 0) {
            const nextSong = playlist.shift();
            currentVideoId = nextSong.id;
            io.emit('changeVideo', currentVideoId);
            io.emit('updatePlaylist', playlist);
        }
    });

    socket.on('adminPlay', (time) => { if (socket.role === 'admin') socket.broadcast.emit('memberPlay', time); });
    socket.on('adminPause', () => { if (socket.role === 'admin') socket.broadcast.emit('memberPause'); });

    socket.on('disconnect', () => {
        io.emit('viewersUpdate', io.engine.clientsCount);
        if (socket.username) {
            io.emit('newMessage', { id: 'sys-'+Date.now(), name: 'Hệ thống 🤖', text: `🏃‍♂️ [${socket.username}] đã rời phòng.`, role: 'system' });
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 Trạm nhạc của ông chủ chạy tại http://localhost:3000');
});