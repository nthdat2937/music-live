const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');
const ytSearch = require('yt-search');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wnioetdrphkdylkoybsu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p0VSduH3epzQVUdvAf2kPQ_aoWk_l1T';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function logMusicHistory(videoId, title, addedBy) {
    try {
        const { error } = await supabase.from('music_history').insert([{
            video_id: videoId,
            title: title,
            added_by: addedBy,
            played_at: new Date().toISOString()
        }]);
        if (error) {
            console.error('Supabase Error (music_history):', error.message);
        } else {
            console.log('Đã lưu lịch sử bài hát:', title);
        }
    } catch (err) {
        console.error('Supabase Exception:', err.message);
    }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let playlist = [];
let currentVideoId = '';
let currentVideoTitle = 'Chưa có bài hát nào';
let pinnedMessage = null;
let loopMode = false;
let isPlayerIdle = true;
let lastGlobalVideoEndedTime = 0;

// Draw game state
let connectedUsers = new Map();
let drawGame = {
    active: false, state: 'inactive', drawerId: null, drawerName: '',
    word: '', scores: {}, timeLeft: 90, timer: null,
    guessedPlayers: [], canvasHistory: []
};
const DRAW_WORDS = [
    'con mèo', 'con chó', 'ngôi nhà', 'cái cây', 'mặt trời', 'mặt trăng', 'con cá', 'bông hoa',
    'xe đạp', 'ô tô', 'máy bay', 'con bướm', 'quả táo', 'cái bàn', 'cái ghế', 'con gà', 'con voi',
    'con rắn', 'cầu vồng', 'ngôi sao', 'trái tim', 'con ong', 'pizza', 'kem', 'guitar', 'điện thoại',
    'cái kéo', 'con nhện', 'người tuyết', 'tên lửa', 'cây dừa', 'quả dưa hấu', 'con khỉ', 'con thỏ',
    'con rùa', 'cái ô', 'đồng hồ', 'cái nón', 'đôi giày', 'con mắt', 'bàn tay', 'ngọn núi',
    'con sông', 'cái cầu', 'chiếc thuyền', 'xe buýt', 'xe lửa', 'robot', 'khủng long', 'siêu nhân',
    'cái ly', 'cái chìa khóa', 'bóng đèn', 'cái quạt', 'cây bút', 'cuốn sách', 'cái bánh', 'con ếch',
    'con cua', 'con sứa', 'cá heo', 'chim cánh cụt', 'con gấu', 'hoa hướng dương', 'cây nấm', 'quả chuối'
];
function getRandomWord() { return DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)]; }
function generateHint(word) {
    return word.split(' ').map(w => w.split('').map(() => '_').join(' ')).join('   ');
}
function getDrawUserList() {
    const users = [];
    connectedUsers.forEach((u, id) => users.push({ id, name: u.name, nameColor: u.nameColor }));
    return users;
}
function endDrawRound() {
    if (drawGame.timer) { clearInterval(drawGame.timer); drawGame.timer = null; }
    drawGame.state = 'waiting';
    io.emit('drawRoundEnd', { word: drawGame.word, scores: drawGame.scores });
    setTimeout(() => {
        if (drawGame.active) io.emit('drawWaitingForDrawer', { users: getDrawUserList(), scores: drawGame.scores });
    }, 3000);
}

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
        while ((match = regex.exec(html)) !== null && count < 4) {
            results.push("- " + match[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<'));
            count++;
        }
        return results.join('\n');
    } catch (e) {
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
            let isValid = false;
            let adminLabel = 'Admin';

            if (username.toLowerCase() === 'nthdat') {
                if (password === ADMIN_PASSWORD) isValid = true;
                adminLabel = 'Admin Chính';
            } else {
                if (password === '16082009' || /^[0-9]{8}$/.test(password)) isValid = true;
                adminLabel = 'Doo';
            }

            if (isValid) {
                socket.username = username + ` 😎`;
                socket.role = 'admin';
                socket.nameColor = nameColor || '#fbbc04';
                connectedUsers.set(socket.id, { name: socket.username, role: 'admin', nameColor: socket.nameColor });
                socket.emit('authResult', { success: true, role: 'admin', currentVideoId, currentVideoTitle, playlist, pinnedMessage, loopMode, drawGame: drawGame.active ? { active: true, state: drawGame.state, scores: drawGame.scores } : null });
                io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `👑 Admin [${socket.username}] đã lên sàn điều khiển nhạc!`, role: 'system' });
            } else {
                socket.emit('authResult', { success: false, message: 'Sai mật khẩu hoặc ngày sinh rồi ông chủ ơi! ❌' });
            }
        } else {
            socket.username = username;
            socket.role = 'member';
            socket.nameColor = nameColor || '#aaaaaa';
            connectedUsers.set(socket.id, { name: socket.username, role: 'member', nameColor: socket.nameColor });
            socket.emit('authResult', { success: true, role: 'member', currentVideoId, currentVideoTitle, playlist, pinnedMessage, loopMode, drawGame: drawGame.active ? { active: true, state: drawGame.state, scores: drawGame.scores } : null });
            io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `👋 Chào mừng [${socket.username}] đã tham gia phòng nhạc!`, role: 'system' });
        }
        if (drawGame.active) io.emit('drawUsersUpdate', getDrawUserList());
    });


    socket.on('sendMessage', async (msg) => {
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
        let textMsg = typeof msg === 'string' ? msg : (msg.type === 'text' ? msg.text : '');
        let replyTo = typeof msg === 'object' && msg.replyTo ? msg.replyTo : null;

        if (textMsg && textMsg.trim() !== '') {
            // Check draw game guess
            if (drawGame.active && drawGame.state === 'playing' && socket.id !== drawGame.drawerId && !drawGame.guessedPlayers.includes(socket.id)) {
                const guess = textMsg.trim().toLowerCase();
                if (guess === drawGame.word.toLowerCase()) {
                    drawGame.guessedPlayers.push(socket.id);
                    const pts = Math.max(10, Math.ceil(drawGame.timeLeft / 90 * 100));
                    if (!drawGame.scores[socket.id]) drawGame.scores[socket.id] = { name: senderName, score: 0, nameColor: senderColor };
                    drawGame.scores[socket.id].score += pts;
                    if (!drawGame.scores[drawGame.drawerId]) {
                        const dr = connectedUsers.get(drawGame.drawerId);
                        drawGame.scores[drawGame.drawerId] = { name: dr?.name || '', score: 0, nameColor: dr?.nameColor || '#aaa' };
                    }
                    drawGame.scores[drawGame.drawerId].score += 25;
                    io.emit('newMessage', { id: 'draw-' + Date.now(), name: 'Trò chơi 🎨', text: `🎉 ${senderName} đã đoán đúng! (+${pts} điểm)`, role: 'system' });
                    io.emit('drawScoreUpdate', drawGame.scores);
                    const playersCanGuess = Array.from(connectedUsers.keys()).filter(id => id !== drawGame.drawerId);
                    if (drawGame.guessedPlayers.length >= playersCanGuess.length) setTimeout(() => endDrawRound(), 2000);
                    return;
                }
            }

            const textLower = textMsg.trim().toLowerCase();

            if (textLower.startsWith('/') && !textLower.startsWith('/ai')) {
                if (socket.role !== 'admin') {
                    socket.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống ❌',
                        text: `Lệnh **${textLower.split(' ')[0]}** chỉ dành cho Quản trị viên!`,
                        role: 'system'
                    });
                    return;
                }
            }

            io.emit('newMessage', {
                id: msgId, senderId: socket.id, name: senderName,
                nameColor: senderColor, text: textMsg, role: senderRole,
                replyTo: replyTo
            });

            if (textLower === '/skip') {
                if (playlist.length > 0) {
                    const nextSong = playlist.shift();
                    currentVideoId = nextSong.id;
                    currentVideoTitle = nextSong.title;
                    io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                    io.emit('updatePlaylist', playlist);
                    io.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống 🎵',
                        text: `⏭️ **${senderName}** đã chuyển bài. Đang phát: **${currentVideoTitle}**`,
                        role: 'system'
                    });
                    isPlayerIdle = false;
                    logMusicHistory(currentVideoId, currentVideoTitle, nextSong.addedBy || 'Người dùng');
                } else {
                    currentVideoId = '';
                    currentVideoTitle = 'Chưa có bài hát nào';
                    isPlayerIdle = true;
                    io.emit('stopVideo');
                    io.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống 🎵',
                        text: `⏭️ **${senderName}** đã chuyển bài. Đã hết danh sách phát.`,
                        role: 'system'
                    });
                }
                return;
            }

            if (textLower === '/repeat') {
                loopMode = !loopMode;
                io.emit('loopModeUpdate', loopMode);
                io.emit('newMessage', {
                    id: 'sys-' + Date.now(),
                    name: 'Hệ thống 🎵',
                    text: `🔁 **${senderName}** đã ${loopMode ? 'BẬT' : 'TẮT'} chế độ lặp lại.`,
                    role: 'system'
                });
                return;
            }

            if (textLower.startsWith('/move ')) {
                const args = textLower.substring(6).trim().split(/\s+/);
                if (args.length === 2) {
                    const idx1 = parseInt(args[0]) - 1;
                    const idx2 = parseInt(args[1]) - 1;
                    if (!isNaN(idx1) && !isNaN(idx2) && idx1 >= 0 && idx2 >= 0 && idx1 < playlist.length && idx2 < playlist.length) {
                        const temp = playlist[idx1];
                        playlist[idx1] = playlist[idx2];
                        playlist[idx2] = temp;
                        io.emit('updatePlaylist', playlist);
                        io.emit('newMessage', {
                            id: 'sys-' + Date.now(),
                            name: 'Hệ thống 🎵',
                            text: `🔄 **${senderName}** đã đổi vị trí bài số ${idx1 + 1} và ${idx2 + 1}.`,
                            role: 'system'
                        });
                    } else {
                        socket.emit('newMessage', {
                            id: 'sys-' + Date.now(),
                            name: 'Hệ thống 🎵',
                            text: `❌ Số thứ tự không hợp lệ. Vui lòng nhập từ 1 đến ${playlist.length}.`,
                            role: 'system'
                        });
                    }
                } else {
                    socket.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống 🎵',
                        text: `❌ Cú pháp sai. Hãy dùng: /move <số 1> <số 2> (ví dụ: /move 1 3)`,
                        role: 'system'
                    });
                }
                return;
            }

            if (textLower.startsWith('/remove ')) {
                const idxStr = textLower.substring(8).trim();
                const idx = parseInt(idxStr) - 1;
                if (!isNaN(idx) && idx >= 0 && idx < playlist.length) {
                    const removed = playlist.splice(idx, 1)[0];
                    io.emit('updatePlaylist', playlist);
                    io.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống 🎵',
                        text: `🗑️ **${senderName}** đã xóa bài **${removed.title}** khỏi danh sách chờ.`,
                        role: 'system'
                    });
                } else {
                    socket.emit('newMessage', {
                        id: 'sys-' + Date.now(),
                        name: 'Hệ thống 🎵',
                        text: `❌ Số thứ tự không hợp lệ. Vui lòng nhập từ 1 đến ${playlist.length}.`,
                        role: 'system'
                    });
                }
                return;
            }

            if (textLower.startsWith('/add ')) {
                const query = textMsg.trim().substring(5).trim();
                if (query) {
                    try {
                        let videoId = query;
                        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                            const r = await ytSearch(videoId);
                            if (r && r.videos.length > 0) {
                                videoId = r.videos[0].videoId;
                            } else {
                                throw new Error('Not found');
                            }
                        }

                        const info = await getYoutubeInfo(videoId);
                        info.addedBy = senderName;
                        info.addedByColor = senderColor;
                        playlist.push(info);
                        io.emit('updatePlaylist', playlist);
                        io.emit('newMessage', {
                            id: 'sys-' + Date.now(),
                            name: 'Hệ thống 🎵',
                            text: `✅ Đã thêm **${info.title}** vào danh sách chờ.`,
                            role: 'system'
                        });

                        if (isPlayerIdle) {
                            const nextSong = playlist.shift();
                            currentVideoId = nextSong.id;
                            currentVideoTitle = nextSong.title;
                            io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                            io.emit('updatePlaylist', playlist);
                            isPlayerIdle = false;
                            logMusicHistory(currentVideoId, currentVideoTitle, nextSong.addedBy || 'Groq AI');
                        }
                    } catch (err) {
                        socket.emit('newMessage', {
                            id: 'sys-' + Date.now(),
                            name: 'Hệ thống ❌',
                            text: `Không tìm thấy bài hát "${query}".`,
                            role: 'system'
                        });
                    }
                }
                return;
            }

            if (textMsg.trim().toLowerCase().startsWith('/ai ')) {
                const query = textMsg.trim().substring(4).trim();
                if (query) callGroqAI(query, senderName);
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

    socket.on('addSong', async (inputData, callback) => {
        let videoId = inputData.trim();
        let success = false;
        try {
            if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                const r = await ytSearch(videoId);
                if (r && r.videos.length > 0) {
                    videoId = r.videos[0].videoId;
                }
            }

            // Anti-spam duplicate check
            if (videoId === currentVideoId || playlist.some(song => song.id === videoId)) {
                if (typeof callback === 'function') {
                    callback({ success: false, message: 'Bài hát đã có trong hàng đợi hoặc đang phát!' });
                }
                return;
            }

            const info = await getYoutubeInfo(videoId);
            info.addedBy = socket.username || 'Ẩn danh';
            info.addedByColor = socket.nameColor || '#aaaaaa';
            playlist.push(info);
            io.emit('updatePlaylist', playlist);

            if (isPlayerIdle) {
                const nextSong = playlist.shift();
                currentVideoId = nextSong.id;
                currentVideoTitle = nextSong.title;
                io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                io.emit('updatePlaylist', playlist);
                isPlayerIdle = false;
                logMusicHistory(currentVideoId, currentVideoTitle, nextSong.addedBy || 'Người dùng');
            }

            success = true;
        } catch (err) {
            console.error('Lỗi khi thêm bài hát:', err);
        }
        if (typeof callback === 'function') {
            callback({ success });
        }
    });

    socket.on('adminReorderPlaylist', (newPlaylist) => {
        if (socket.role === 'admin') {
            playlist = newPlaylist;
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
        if (socket.role === 'admin') {
            if (playlist.length > 0) {
                const nextSong = playlist.shift();
                currentVideoId = nextSong.id;
                currentVideoTitle = nextSong.title;
                io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                io.emit('updatePlaylist', playlist);
                isPlayerIdle = false;
                logMusicHistory(currentVideoId, currentVideoTitle, nextSong.addedBy || 'Admin');
            } else {
                currentVideoId = '';
                currentVideoTitle = 'Chưa có bài hát nào';
                isPlayerIdle = true;
                io.emit('stopVideo');
                isPlayerIdle = true;
            }
        }
    });

    // Toggle loop mode (admin only)
    socket.on('adminToggleLoop', () => {
        if (socket.role === 'admin') {
            loopMode = !loopMode;
            io.emit('loopModeUpdate', loopMode);
        }
    });

    // When a video ends on admin's player, handle auto-play logic
    socket.on('videoEnded', (clientVideoId) => {
        if (socket.role === 'admin') {
            // Ignore if the client is reporting an end for a video that is no longer current
            if (clientVideoId && clientVideoId !== currentVideoId) return;

            // Debounce to prevent multiple admins triggering this almost simultaneously
            const now = Date.now();
            if (now - lastGlobalVideoEndedTime < 3000) return;
            lastGlobalVideoEndedTime = now;

            if (loopMode) {
                // Replay the current video
                io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                isPlayerIdle = false;
            } else if (playlist.length > 0) {
                // Auto-play next song from queue
                const nextSong = playlist.shift();
                currentVideoId = nextSong.id;
                currentVideoTitle = nextSong.title;
                io.emit('changeVideo', { id: currentVideoId, title: currentVideoTitle });
                io.emit('updatePlaylist', playlist);
                isPlayerIdle = false;
                logMusicHistory(currentVideoId, currentVideoTitle, nextSong.addedBy || 'Hệ thống');
            } else {
                isPlayerIdle = true;
            }
        }
    });

    socket.on('adminPlay', (time) => { if (socket.role === 'admin') socket.broadcast.emit('memberPlay', time); });
    socket.on('adminPause', () => { if (socket.role === 'admin') socket.broadcast.emit('memberPause'); });

    // Draw game events
    socket.on('adminStartDrawGame', () => {
        if (socket.role !== 'admin') return;
        drawGame.active = true; drawGame.state = 'waiting'; drawGame.scores = {}; drawGame.canvasHistory = [];
        io.emit('drawGameStarted', { users: getDrawUserList(), scores: {} });
    });
    function startDrawRound(drawerId) {
        if (!connectedUsers.has(drawerId)) return;
        const user = connectedUsers.get(drawerId);
        drawGame.state = 'playing'; drawGame.drawerId = drawerId; drawGame.drawerName = user.name;
        drawGame.word = getRandomWord(); drawGame.timeLeft = 90; drawGame.guessedPlayers = []; drawGame.canvasHistory = [];
        if (drawGame.timer) clearInterval(drawGame.timer);
        drawGame.timer = setInterval(() => { drawGame.timeLeft--; io.emit('drawTimerUpdate', drawGame.timeLeft); if (drawGame.timeLeft <= 0) endDrawRound(); }, 1000);
        io.emit('drawRoundStart', { drawerId, drawerName: user.name, hint: generateHint(drawGame.word), timeLeft: 90 });
        // Send word AFTER roundStart so it doesn't get overwritten
        setTimeout(() => {
            io.to(drawerId).emit('drawYourWord', drawGame.word);
        }, 100);
    }

    socket.on('adminPickDrawer', (drawerId) => {
        if (socket.role !== 'admin') return;
        startDrawRound(drawerId);
    });

    socket.on('adminRandomPickDrawer', () => {
        if (socket.role !== 'admin') return;
        const users = Array.from(connectedUsers.keys());
        if (users.length === 0) return;
        const winnerId = users[Math.floor(Math.random() * users.length)];

        io.emit('drawRandomPickAnimation', { winnerId, users: getDrawUserList() });

        setTimeout(() => {
            startDrawRound(winnerId);
        }, 3000);
    });
    socket.on('drawStroke', (data) => { if (socket.id === drawGame.drawerId) { drawGame.canvasHistory.push(data); socket.broadcast.emit('drawStroke', data); } });
    socket.on('drawClear', () => { if (socket.id === drawGame.drawerId) { drawGame.canvasHistory = []; socket.broadcast.emit('drawClear'); } });
    socket.on('adminEndDrawGame', () => {
        if (socket.role !== 'admin') return;
        if (drawGame.timer) { clearInterval(drawGame.timer); drawGame.timer = null; }
        drawGame.active = false; drawGame.state = 'inactive';
        io.emit('drawGameEnded');
    });
    socket.on('skipWord', () => {
        if (drawGame.state !== 'playing') return;
        if (socket.id !== drawGame.drawerId) return; // ONLY drawer can skip
        drawGame.word = getRandomWord(); drawGame.canvasHistory = []; drawGame.guessedPlayers = []; drawGame.timeLeft = 90;
        io.to(drawGame.drawerId).emit('drawYourWord', drawGame.word);
        io.emit('drawNewWord', { hint: generateHint(drawGame.word), timeLeft: 90 });
        io.emit('drawClear');
    });
    socket.on('requestCanvasHistory', () => {
        if (drawGame.canvasHistory.length > 0) socket.emit('drawCanvasHistory', drawGame.canvasHistory);
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('viewersUpdate', io.engine.clientsCount);
        if (drawGame.active && socket.id === drawGame.drawerId && drawGame.state === 'playing') {
            io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Trò chơi 🎨', text: `😢 Người vẽ đã rời phòng! Kết thúc lượt.`, role: 'system' });
            endDrawRound();
        }
        if (drawGame.active) io.emit('drawUsersUpdate', getDrawUserList());
        if (socket.username) {
            io.emit('newMessage', { id: 'sys-' + Date.now(), name: 'Hệ thống 🤖', text: `🏃‍♂️ [${socket.username}] đã rời phòng.`, role: 'system' });
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 Trạm nhạc chạy tại http://localhost:3000');
});