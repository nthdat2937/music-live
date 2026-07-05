const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');
const ytSearch = require('yt-search');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let playlist = [];
let currentVideoId = 'jfKfPfyJRdk';
let pinnedMessage = null;

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

const GROQ_API_KEY = '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';

async function quickWebSearch(query) {
    try {
        const currentYear = new Date().getFullYear();
        const lowerQuery = query.toLowerCase();
        // Only append year if they are asking for something "new" or "latest" to avoid ruining generic searches
        const needsYear = lowerQuery.includes('mới') || lowerQuery.includes('gần đây') || lowerQuery.includes('hiện tại');
        const searchQuery = (!query.includes(currentYear.toString()) && needsYear) ? query + ' ' + currentYear : query;
        
        const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(searchQuery), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();
        const regex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
        let match;
        let results = [];
        let count = 0;
        while((match = regex.exec(html)) !== null && count < 4) {
            results.push("- " + match[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<'));
            count++;
        }
        return results.join('\n');
    } catch(e) {
        return '';
    }
}

async function callGroqAI(query, userName) {
    try {
        // Fetch web context to prevent hallucinations
        const webContext = await quickWebSearch(query);
        const currentDate = new Date().toLocaleDateString('vi-VN');
        const sysPrompt = `Bạn là trợ lý AI âm nhạc siêu việt. Hôm nay: ${currentDate}. Người hỏi: ${userName}.
Nhiệm vụ: Trả lời ngắn gọn, thân thiện (dưới 100 từ).
Luật lệ:
1. Nếu yêu cầu gợi ý bài hát của ca sĩ/chủ đề: PHẢI liệt kê những bài hát HAY NHẤT, HOT NHẤT và NỔI TIẾNG NHẤT của họ.
2. Tuyệt đối KHÔNG BỊA TÊN bài hát. Phải khớp đúng 100% tên bài hát với ca sĩ ngoài đời thực.
3. Nếu là tin tức mới, dùng "Kết quả web". Nếu gợi ý nhạc, cứ tự tin dùng kiến thức nội bộ để chọn bài hay nhất, không bị phụ thuộc vào web nếu web trả về kết quả rác.

Kết quả tìm kiếm web:
${webContext}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: query }
                ],
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            let aiMsg = data.choices[0].message.content;
            if (!aiMsg || aiMsg.trim() === '') {
                aiMsg = '*(AI đã suy nghĩ quá lâu và quên mất câu trả lời)* 😅';
            }
            
            io.emit('newMessage', {
                id: 'ai-' + Date.now(),
                senderId: 'ai-bot',
                name: 'AI Assistant 🤖',
                nameColor: '#10a37f', // AI Color
                text: aiMsg,
                role: 'system' // Broadcast as system message so it has a distinct look
            });
        } else {
            console.error('Groq AI Error:', data);
            io.emit('newMessage', {
                id: 'ai-err-' + Date.now(),
                senderId: 'ai-bot',
                name: 'AI Assistant 🤖',
                nameColor: '#ff6b6b',
                text: 'Xin lỗi, AI đang gặp lỗi hoặc tên model không hỗ trợ! (' + (data.error?.message || 'Lỗi không xác định') + ')',
                role: 'system'
            });
        }
    } catch (err) {
        console.error('Groq API catch error:', err);
    }
}

io.on('connection', (socket) => {
    console.log('🔌 Một kết nối mới: ' + socket.id);
    io.emit('viewersUpdate', io.engine.clientsCount);

    socket.on('joinRoom', (data) => {
        const { name, isAdmin, password, nameColor } = data;
        const username = name.trim() || 'Người dùng ẩn danh';

        if (isAdmin) {
            if (password === ADMIN_PASSWORD) {
                socket.username = username + ' 😎 (Admin)';
                socket.role = 'admin';
                socket.nameColor = nameColor || '#fbbc04';
                socket.emit('authResult', { success: true, role: 'admin', currentVideoId, playlist, pinnedMessage });
                io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `👑 Admin [${socket.username}] đã lên sàn điều khiển nhạc!`, role: 'system' });
            } else {
                socket.emit('authResult', { success: false, message: 'Sai mật khẩu Admin rồi ông chủ ơi! ❌' });
            }
        } else {
            socket.username = username;
            socket.role = 'member';
            socket.nameColor = nameColor || '#aaaaaa';
            socket.emit('authResult', { success: true, role: 'member', currentVideoId, playlist, pinnedMessage });
            io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `👋 Chào mừng [${socket.username}] đã tham gia phòng nhạc!`, role: 'system' });
        }
    });


    socket.on('sendMessage', (msg) => {
        const msgId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const senderName = socket.username || 'Ẩn danh';
        const senderRole = socket.role || 'member';
        const senderColor = socket.nameColor || '#aaaaaa';

        // Handle GIF messages
        if (typeof msg === 'object' && msg.type === 'gif' && msg.gifUrl) {
            io.emit('newMessage', {
                id: msgId,
                senderId: socket.id,
                name: senderName,
                nameColor: senderColor,
                text: '[GIF]',
                gifUrl: msg.gifUrl,
                role: senderRole
            });
            return;
        }

        // Handle plain text messages
        if (typeof msg === 'string' && msg.trim() !== '') {
            io.emit('newMessage', {
                id: msgId,
                senderId: socket.id,
                name: senderName,
                nameColor: senderColor,
                text: msg,
                role: senderRole
            });

            // Trigger AI if message starts with /ai
            if (msg.trim().toLowerCase().startsWith('/ai ')) {
                const query = msg.trim().substring(4).trim();
                if (query) {
                    callGroqAI(query, senderName);
                }
            }
        }
    });



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


    socket.on('requestSync', () => {
        socket.broadcast.emit('memberRequestSync');
    });

    socket.on('adminAddSong', async (inputData) => {
        if (socket.role === 'admin') {
            let videoId = inputData.trim();
            // If it's not exactly an 11-character YouTube ID, treat it as a search query
            if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                try {
                    const r = await ytSearch(videoId);
                    if (r && r.videos.length > 0) {
                        videoId = r.videos[0].videoId;
                    }
                } catch (err) {
                    console.error('Lỗi tìm kiếm YouTube:', err);
                }
            }
            
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
            io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `🏃‍♂️ [${socket.username}] đã rời phòng.`, role: 'system' });
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 Trạm nhạc chạy tại http://localhost:3000');
});