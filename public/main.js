const socket = io();
socket.on('connect', () => {
    if (myRole) {

        joinRoom();
    }
});
let player;
let isPlayerReady = false;
let isYoutubeApiLoaded = false;
let pendingVideoId = null;
let myRole = '';
let initialVideoId = '';
let myUsername = '';


function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('mini');
}

function showTab(tab) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const activeTab = document.querySelector(`.sidebar-item[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');

    document.getElementById('left-column').classList.remove('not-home');
    document.getElementById('left-column').classList.remove('hidden');
    document.getElementById('history-column').classList.add('hidden');
    document.getElementById('top-column').classList.add('hidden');

    if (tab === 'home') {
        // Just home
        resetMiniPlayerDrag();
    } else {
        document.getElementById('left-column').classList.add('not-home');
        if (tab === 'history') {
            document.getElementById('history-column').classList.remove('hidden');
            loadHistory();
        } else if (tab === 'top') {
            document.getElementById('top-column').classList.remove('hidden');
            loadTopNhac();
        }
    }
}

async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div style="color:var(--text-muted);">Đang tải...</div>';

    try {
        const supabaseClient = supabase.createClient('https://wnioetdrphkdylkoybsu.supabase.co', 'sb_publishable_p0VSduH3epzQVUdvAf2kPQ_aoWk_l1T');
        const { data, error } = await supabaseClient
            .from('music_history')
            .select('*')
            .order('played_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted);">Chưa có lịch sử phát nào.</div>';
            return;
        }

        let groupedData = [];
        for (let i = 0; i < data.length; i++) {
            const current = data[i];
            if (groupedData.length > 0 && groupedData[groupedData.length - 1].video_id === current.video_id) {
                groupedData[groupedData.length - 1].count = (groupedData[groupedData.length - 1].count || 1) + 1;
            } else {
                current.count = 1;
                groupedData.push(current);
            }
        }

        list.innerHTML = groupedData.map(song => {
            const d = new Date(song.played_at);
            const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = d.toLocaleDateString('vi-VN');

            const isStacked = song.count > 1;
            const imgShadow = isStacked ? '3px 3px 0px rgba(255,255,255,0.2), 6px 6px 0px rgba(255,255,255,0.1)' : '0 2px 4px rgba(0,0,0,0.2)';
            const badgeHtml = isStacked ? `<div style="position:absolute; top:-6px; right:-6px; background:#e03131; color:white; font-size:10px; font-weight:bold; padding:2px 5px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index:2;">x${song.count}</div>` : '';

            return `
                        <div class="history-item" style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; gap: 12px; margin-bottom: ${isStacked ? '6px' : '0'};">
                            <div style="position:relative; flex-shrink:0;">
                                <img src="https://img.youtube.com/vi/${song.video_id}/mqdefault.jpg" alt="thumbnail" style="width: 56px; height: 42px; object-fit: cover; border-radius: 6px; box-shadow: ${imgShadow};">
                                ${badgeHtml}
                            </div>
                            <div style="flex: 1; min-width:0;">
                                <div class="history-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(song.title)}</div>
                                <div class="history-meta">
                                    Thêm bởi: <strong>${escapeHtml(song.added_by)}</strong> • Gần nhất: ${timeStr} ${dateStr}
                                </div>
                            </div>
                            <button class="btn-add-search" style="flex-shrink:0;" onclick="addSongFromHistory('${song.video_id}', this)" title="Thêm vào hàng đợi">
                                <span class="material-symbols-outlined" style="font-size:20px;">add</span>
                            </button>
                        </div>
                    `;
        }).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = '<div style="color:#ff6b6b;">Lỗi tải dữ liệu lịch sử. Xin vui lòng thử lại!</div>';
    }
}

async function loadTopNhac() {
    const list = document.getElementById('top-list');
    list.innerHTML = '<div style="color:var(--text-muted);">Đang tải Top nhạc...</div>';

    try {
        const supabaseClient = supabase.createClient('https://ktqdzlhvdkerjajffgfi.supabase.co', 'sb_publishable_1wm-eXETyu07vl61sY4mBQ_xwYZVOCj');
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('Tên', { ascending: true })
            .limit(50);

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted);">Chưa có bài hát nào trong Top.</div>';
            return;
        }

        list.innerHTML = data.map((song, index) => {
            const avatarUrl = song.avatar || 'https://via.placeholder.com/120x68?text=No+Image';
            return `
                        <div class="history-item" style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; gap: 12px; margin-bottom: 8px;">
                            <div style="position:relative; flex-shrink:0;">
                                <img src="${escapeHtml(avatarUrl)}" alt="thumbnail" style="width: 56px; height: 42px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            </div>
                            <div style="flex: 1; min-width:0;">
                                <div class="history-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size: 15px;">${escapeHtml(song['Tên'])} <span style="font-size: 13px; color: var(--text-muted);">- ${escapeHtml(song['Ca sĩ'] || '')}</span></div>
                                <div class="history-meta" style="margin-top: 4px;">
                                    Thêm bởi: <span style="color:#e0e0e0;font-weight:500;">${escapeHtml(song.add_by || 'Unknown')}</span>
                                </div>
                            </div>
                            <button class="btn-add-search" style="flex-shrink:0;" onclick="addSongFromHistory('${escapeHtml(song['Tên'] + ' ' + (song['Ca sĩ'] || ''))}', this)" title="Thêm vào hàng đợi">
                                <span class="material-symbols-outlined" style="font-size:20px;">add</span>
                            </button>
                        </div>
                    `;
        }).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = '<div style="color:#ff6b6b;">Lỗi tải Top nhạc: ' + err.message + '</div>';
    }
}

function addSongFromHistory(videoId, btn) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px; animation: spin 1s linear infinite;">sync</span>';
    btn.disabled = true;

    socket.emit('addSong', videoId, (res) => {
        if (res && res.success) {
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check</span>';
            btn.style.background = '#51cf66';
        } else {
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">close</span>';
            btn.style.background = '#ff6b6b';
            alert(res && res.message ? res.message : "Không tìm thấy bài hát hoặc có lỗi xảy ra!");
        }
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            btn.style.background = '';
        }, 2000);
    });
}

let myNameColor = '#3ea6ff';
let isLoopMode = false;

let selectedAdminType = null;

(function restoreSavedUser() {
    const savedName = localStorage.getItem('musiclive_username');
    const savedColor = localStorage.getItem('musiclive_namecolor');
    const savedAdminType = localStorage.getItem('musiclive_admin_type');
    const savedPassword = localStorage.getItem('musiclive_password');

    if (savedName) {
        document.getElementById('username-input').value = savedName;
    }
    if (savedColor) {
        document.getElementById('name-color-input').value = savedColor;
    }

    if (savedAdminType) {
        selectAdmin(savedName);
        if (savedPassword) {
            document.getElementById('password-input').value = savedPassword;
        }
        setTimeout(() => joinRoom(), 300);
    } else if (savedName) {
        setTimeout(() => joinRoom(), 300);
    }
})();


function selectRole(role) {
    document.getElementById('role-buttons-wrapper').classList.add('hidden');
    if (role === 'user') {
        document.getElementById('login-prompt').innerText = 'Nhập thông tin của bạn';
        document.getElementById('user-details-wrapper').classList.remove('hidden');
        document.getElementById('join-btn').classList.remove('hidden');
        document.getElementById('username-input').readOnly = false;
        selectedAdminType = null;
    } else if (role === 'admin') {
        document.getElementById('login-prompt').innerText = 'Xác thực Quản trị viên';
        document.getElementById('admin-list-wrapper').classList.remove('hidden');
    }
}

function selectAdmin(name) {
    document.getElementById('user-details-wrapper').classList.remove('hidden');
    document.getElementById('username-input').value = name;
    document.getElementById('username-input').readOnly = true;

    const pwdInput = document.getElementById('password-input');
    document.getElementById('password-wrapper').classList.remove('hidden');
    document.getElementById('join-btn').classList.remove('hidden');

    if (name === 'nthdat') {
        selectedAdminType = 'main';
        pwdInput.placeholder = 'Nhập mật khẩu admin...';
    } else {
        selectedAdminType = 'sub';
        pwdInput.placeholder = 'Nhập ngày sinh (vd: 01012001)...';
    }
    pwdInput.focus();
}

function checkAdminName(name) {

}

function joinRoom() {
    const name = document.getElementById('username-input').value;
    const password = document.getElementById('password-input').value;
    const nameColor = document.getElementById('name-color-input').value;
    const isAdmin = selectedAdminType !== null;

    if (!name.trim()) {
        alert("Vui lòng nhập tên hiển thị!");
        return;
    }

    myUsername = name.trim();
    myNameColor = nameColor;

    localStorage.setItem('musiclive_username', myUsername);
    localStorage.setItem('musiclive_namecolor', myNameColor);

    if (player && typeof player.playVideo === 'function') {
        player.playVideo();
    }

    socket.emit('joinRoom', { name, isAdmin, password, nameColor });
}

socket.on('authResult', (res) => {
    if (res.success) {
        myRole = res.role;

        if (myRole === 'admin') {
            localStorage.setItem('musiclive_admin_type', selectedAdminType || 'main');
            localStorage.setItem('musiclive_password', document.getElementById('password-input').value);
        } else {
            localStorage.removeItem('musiclive_admin_type');
            localStorage.removeItem('musiclive_password');
        }

        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-room').classList.remove('hidden');

        if (res.currentVideoTitle) {
            document.title = res.currentVideoTitle;
            document.getElementById('welcome-title').innerText = res.currentVideoTitle;
            fetchLyrics(res.currentVideoTitle);
        }


        const navRight = document.getElementById('navbar-right');
        navRight.classList.remove('hidden');
        const navUsername = document.getElementById('navbar-username');
        navUsername.textContent = myUsername;
        navUsername.style.color = myNameColor;


        document.getElementById('navbar-search').classList.remove('hidden');
        document.getElementById('menu-btn').classList.remove('hidden');

        if (myRole === 'admin') {
            document.body.classList.add('admin-mode');
            document.getElementById('btn-next-song').classList.remove('hidden');
            document.getElementById('btn-loop').classList.remove('hidden');
            document.getElementById('btn-start-game').classList.remove('hidden');
            document.getElementById('player-container').style.pointerEvents = 'auto';
        }
        document.getElementById('sync-btn').classList.remove('hidden');


        if (res.drawGame && res.drawGame.active) {
            document.getElementById('draw-game-overlay').classList.remove('hidden');
            renderDrawScores(res.drawGame.scores || {});
            socket.emit('requestCanvasHistory');
        }


        if (res.loopMode !== undefined) {
            isLoopMode = res.loopMode;
            updateLoopUI();
        }

        initialVideoId = res.currentVideoId;
        if (!player) {
            createPlayer();
        } else if (typeof player.loadVideoById === 'function') {
            if (initialVideoId) {
                window.ignoreNextStateChange = true;
                window.lastSyncTime = Date.now() + 2000;
                if (isPlayerReady) {
                    player.loadVideoById(initialVideoId);
                    setTimeout(() => socket.emit('requestSync'), 1000);
                } else {
                    pendingVideoId = initialVideoId;
                }
            } else {
                player.stopVideo();
            }
        } else if (initialVideoId) {
            pendingVideoId = initialVideoId;
        }
        updatePlaylistUI(res.playlist);
        if (res.pinnedMessage) updatePinnedMessageUI(res.pinnedMessage);
        if (res.caroGame) updateCaroUI(res.caroGame);
        if (res.chessGame) socket._callbacks['$chessUpdate'][0](res.chessGame);
    } else {
        alert(res.message);
    }
});


function logout() {

    localStorage.removeItem('musiclive_username');
    localStorage.removeItem('musiclive_namecolor');
    localStorage.removeItem('musiclive_admin_type');
    localStorage.removeItem('musiclive_password');


    myRole = '';
    myUsername = '';
    myNameColor = '#3ea6ff';


    document.getElementById('main-room').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('navbar-right').classList.add('hidden');
    document.getElementById('navbar-search').classList.add('hidden');
    document.getElementById('menu-btn').classList.add('hidden');


    document.body.classList.remove('admin-mode');
    document.getElementById('btn-next-song').classList.add('hidden');
    document.getElementById('sync-btn').classList.add('hidden');


    document.getElementById('username-input').value = '';
    document.getElementById('name-color-input').value = '#3ea6ff';
    document.getElementById('password-input').value = '';
    document.getElementById('password-wrapper').classList.add('hidden');


    document.getElementById('chat-box-ui').innerHTML = '';
    lastChatSenderId = null;


    socket.disconnect();
    socket.connect();
}

let soundEnabled = true;
function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-btn').innerHTML = soundEnabled ? '<span class="material-symbols-outlined" style="font-size:18px;">notifications_active</span>' : '<span class="material-symbols-outlined" style="font-size:18px;">notifications_off</span>';
}

function playChatSound() {
    if (!soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) { }
}

let currentReply = null;

function setReply(id, name, text) {
    currentReply = { id, name, text };
    document.getElementById('reply-container').classList.remove('hidden');
    document.getElementById('reply-author').innerText = name;
    document.getElementById('reply-text').innerText = text;
    document.getElementById('chat-input').focus();
}

function cancelReply() {
    currentReply = null;
    document.getElementById('reply-container').classList.add('hidden');
}

function sendChat() {
    const input = document.getElementById('chat-input');
    if (input.value.trim() !== "") {
        if (currentReply) {
            socket.emit('sendMessage', { type: 'text', text: input.value, replyTo: currentReply });
            cancelReply();
        } else {
            socket.emit('sendMessage', input.value);
        }
        input.value = '';
    }
    hideGifSuggestions();
}

function updatePinnedMessageUI(msg) {
    const container = document.getElementById('pinned-message-container');
    if (msg) {
        container.classList.remove('hidden');
        document.getElementById('pin-author').innerText = msg.name;
        document.getElementById('pin-text').innerText = msg.text;
        if (myRole === 'admin') document.getElementById('unpin-btn').classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

socket.on('updatePinnedMessage', updatePinnedMessageUI);

socket.on('messageDeleted', (msgId) => {
    const el = document.getElementById('msg-' + msgId);
    if (el) el.remove();
});

socket.on('viewersUpdate', (count) => {
    document.getElementById('viewer-count').innerHTML = `(<span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">visibility</span> ${count})`;
});

let lastChatSenderId = null;

// Generate a consistent color from a string
function stringToColor(str) {
    const colors = ['#e17076','#7bc862','#6ec9cb','#65aadd','#ee7aae','#dda15e','#a695e7','#e8a752'];
    let hash = 0;
    for (let i = 0; i < (str||'').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

socket.on('newMessage', (data) => {
    const chatBox = document.getElementById('chat-box-ui');
    const isSystem = data.role === 'system';
    const isAdminMsg = data.role === 'admin';
    const isOwn = data.senderId === socket.id && !isSystem;
    const senderKey = isSystem ? '__system__' : (data.senderId || data.name || '');

    // Grouping: check if same sender as last message
    const isGrouped = lastChatSenderId === senderKey && !isSystem;
    lastChatSenderId = senderKey;

    // Build classes
    let msgClass = 'chat-message';
    if (isSystem) msgClass += ' system-msg';
    if (isAdminMsg) msgClass += ' admin-msg';
    if (isOwn) msgClass += ' own-msg';
    if (isGrouped) msgClass += ' grouped';
    if (!isGrouped) msgClass += ' group-first';

    // Update previous sibling's grouping for rounded corners
    const prevMsg = chatBox.lastElementChild;
    if (prevMsg && isGrouped) {
        prevMsg.classList.remove('group-last');
    }
    // Mark this message as potentially the last in its group
    msgClass += ' group-last';

    // Actions menu
    let actionsHtml = '';
    if (!isSystem) {
        const safeName = (data.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeText = (data.text || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let adminBtns = '';
        if (myRole === 'admin') {
            adminBtns = `
                        <button class="action-menu-item" onclick="pinMessage('${safeName}', '${safeText}'); closeChatActionsMenu()"><span class="material-symbols-outlined" style="font-size:16px;">push_pin</span> Ghim</button>
                        <button class="action-menu-item" style="color: #ff6b6b;" onclick="deleteMessage('${data.id}'); closeChatActionsMenu()"><span class="material-symbols-outlined" style="font-size:16px;">delete</span> Xóa</button>
                    `;
        }
        actionsHtml = `<div class="chat-actions">
                    <button class="chat-actions-btn" onclick="toggleChatActionsMenu(event)"><span class="material-symbols-outlined" style="font-size:16px;">more_vert</span></button>
                    <div class="chat-actions-menu">
                        <button class="action-menu-item" onclick="setReply('${data.id}', '${safeName}', '${safeText}'); closeChatActionsMenu()"><span class="material-symbols-outlined" style="font-size:16px;">reply</span> Trả lời</button>
                        ${adminBtns}
                    </div>
                </div>`;
    }

    const isScrolledToBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 150;
    const shouldScroll = isScrolledToBottom || isOwn;

    // Content
    let contentHtml = '';
    if (data.gifUrl) {
        contentHtml = `<img class="chat-gif" src="${escapeHtml(data.gifUrl)}" alt="GIF" loading="lazy" onload="if(${shouldScroll}) { const cb = document.getElementById('chat-box-ui'); cb.scrollTop = cb.scrollHeight; }">`;
    } else {
        let safeText = escapeHtml(data.text || '');
        if (isSystem) {
            safeText = safeText
                .replace(/✅/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">check_circle</span>')
                .replace(/⏭️/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">skip_next</span>')
                .replace(/🔁/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">repeat</span>')
                .replace(/🔄/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">sync_alt</span>')
                .replace(/🗑️/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">delete</span>')
                .replace(/❌/g, '<span class="material-symbols-outlined" style="font-size:15px; vertical-align:text-bottom; margin-right:2px;">error</span>');
            safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        contentHtml = `<span class="chat-text">${safeText}</span>`;
    }

    // Author name & color
    let authorStyle = '';
    let finalName = data.name || '';
    if (isSystem) {
        finalName = finalName.replace(/🎵/g, '<span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">smart_toy</span>');
    }
    if (!isSystem && data.nameColor) {
        authorStyle = `style="color: ${escapeHtml(data.nameColor)}"`;
    }

    // Reply quote
    let replyHtml = '';
    if (data.replyTo) {
        const safeReplyName = escapeHtml(data.replyTo.name || '');
        const safeReplyText = escapeHtml(data.replyTo.text || '');
        replyHtml = `<div class="chat-reply-quote" onclick="document.getElementById('msg-${data.replyTo.id}')?.scrollIntoView({behavior: 'smooth', block: 'center'})">
                    <span class="reply-name">${safeReplyName}</span>${safeReplyText}
                </div>`;
    }

    // Avatar (only for other people, first letter of name)
    const avatarInitial = (data.name || '?').charAt(0).toUpperCase();
    const avatarColor = data.nameColor || stringToColor(data.name || '');
    const avatarHtml = isSystem ? '' : `<div class="chat-avatar" style="background:${escapeHtml(avatarColor)}">${avatarInitial}</div>`;

    // Author label (above bubble, only for others, not grouped)
    const authorHtml = isSystem ? '' : `<span class="chat-author" ${authorStyle}>${finalName}</span>`;

    // Build the full message — reply quote sits ABOVE the bubble (Messenger style)
    const msgHtml = `<div class="${msgClass}" id="msg-${data.id}">
                ${avatarHtml}
                <div class="chat-bubble-wrap">
                    ${authorHtml}
                    ${replyHtml}
                    <div class="chat-bubble">
                        ${contentHtml}
                    </div>
                </div>
                ${actionsHtml}
            </div>`;

    chatBox.insertAdjacentHTML('beforeend', msgHtml);

    if (shouldScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(() => {
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 100);
    }

    if (!isOwn && !isSystem) {
        playChatSound();
        if (!chatBubbleOpen && window.innerWidth < 900) {
            unreadCount++;
            updateChatBadge();
        }
    }
});

function toggleChatActionsMenu(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const menu = btn.parentElement.querySelector('.chat-actions-menu');
    const wasOpen = menu.classList.contains('open');
    // Close all open menus first
    document.querySelectorAll('.chat-actions-menu.open').forEach(m => {
        m.classList.remove('open');
        m.style.top = '';
        m.style.left = '';
        m.style.right = '';
    });
    if (!wasOpen) {
        menu.classList.add('open');
        // Position using fixed coords from button
        const rect = btn.getBoundingClientRect();
        const isOwn = btn.closest('.chat-message')?.classList.contains('own-msg');
        const menuHeight = 120; // approximate

        // Vertical: below button, or above if near bottom
        if (rect.bottom + menuHeight > window.innerHeight) {
            menu.style.top = (rect.top - menuHeight) + 'px';
        } else {
            menu.style.top = rect.bottom + 4 + 'px';
        }

        // Horizontal: align to button edge
        if (isOwn) {
            menu.style.right = (window.innerWidth - rect.right) + 'px';
            menu.style.left = 'auto';
        } else {
            menu.style.left = rect.left + 'px';
            menu.style.right = 'auto';
        }
    }
}

function closeChatActionsMenu() {
    document.querySelectorAll('.chat-actions-menu.open').forEach(m => {
        m.classList.remove('open');
        m.style.top = '';
        m.style.left = '';
        m.style.right = '';
    });
}

// Close menu when clicking anywhere outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-actions')) {
        closeChatActionsMenu();
    }
});

function pinMessage(name, text) { socket.emit('adminPinMessage', { name, text }); }
function unpinMessage() { socket.emit('adminUnpinMessage'); }
function deleteMessage(id) { socket.emit('adminDeleteMessage', id); }
function removeSong(index) { socket.emit('adminRemoveSong', index); }


function extractVideoID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

function onYouTubeIframeAPIReady() {
    isYoutubeApiLoaded = true;
    createPlayer();
}

function createPlayer() {
    if (window.YT && window.YT.Player) isYoutubeApiLoaded = true;
    if (player || !isYoutubeApiLoaded || myRole === '') return;

    player = new YT.Player('youtube-player', {
        height: '100%', width: '100%', videoId: initialVideoId || 'M7lc1UVf-VE',
        playerVars: { 'controls': 1, 'disablekb': 1, 'origin': window.location.origin, 'rel': 0 },
        events: {
            'onReady': () => {
                isPlayerReady = true;
                try { if (typeof player.setVolume === 'function') player.setVolume(50); } catch (e) { }
                document.getElementById('status').innerText = "Trạng thái: Đang phát trực tiếp 🟢";
                if (pendingVideoId) {
                    if (typeof player.loadVideoById === 'function') player.loadVideoById(pendingVideoId);
                    pendingVideoId = null;
                    setTimeout(() => socket.emit('requestSync'), 1000);
                } else if (initialVideoId) {
                    setTimeout(() => socket.emit('requestSync'), 1000);
                }
            },
            'onStateChange': (e) => {
                if (e.data == YT.PlayerState.PLAYING) {
                    try {
                        const videoData = player.getVideoData();
                        if (videoData && videoData.title) {
                            if (document.title !== videoData.title) {
                                document.title = videoData.title;
                                document.getElementById('welcome-title').innerText = videoData.title;
                            }
                        }
                    } catch (err) { }
                }
                if (myRole === 'admin') {
                    if (window.ignoreNextStateChange && (Date.now() - window.lastSyncTime < 1500)) {
                        return;
                    }
                    if (e.data == YT.PlayerState.PLAYING) socket.emit('adminPlay', player.getCurrentTime());
                    if (e.data == YT.PlayerState.PAUSED) socket.emit('adminPause');
                    if (e.data == YT.PlayerState.ENDED) socket.emit('videoEnded', window.currentVideoId);
                }
            }
        }
    });
}

function changeVolume(val) {
    if (player && player.setVolume) player.setVolume(val);
    const icon = document.getElementById('volume-icon');
    if (icon) {
        if (val == 0) icon.innerText = 'volume_off';
        else if (val < 50) icon.innerText = 'volume_down';
        else icon.innerText = 'volume_up';
    }
    if (val > 0) isVideoMuted = false;
}

let isVideoMuted = false;
let lastVolume = 50;
function toggleVideoMute() {
    const slider = document.getElementById('volume-slider');
    if (isVideoMuted) {
        isVideoMuted = false;
        slider.value = lastVolume || 50;
        changeVolume(slider.value);
    } else {
        lastVolume = slider.value > 0 ? slider.value : 50;
        isVideoMuted = true;
        slider.value = 0;
        changeVolume(0);
    }
}
function addSong() {
    const input = document.getElementById('song-input');
    const btn = document.querySelector('.btn-add-search') || document.querySelector('.btn-add');
    if (input.value) {
        let originalHtml = '';
        if (btn) {
            originalHtml = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px; animation: spin 1s linear infinite;">sync</span>';
            btn.disabled = true;
        }
        input.disabled = true;

        socket.emit('addSong', extractVideoID(input.value), (res) => {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
            input.disabled = false;
            if (res && res.success) {
                input.value = '';
            } else {
                alert(res && res.message ? res.message : "Không tìm thấy bài hát hoặc có lỗi xảy ra!");
            }
        });
    }
}
function nextSong() { socket.emit('adminNextSong'); }

socket.on('updatePlaylist', (list) => { updatePlaylistUI(list); });
socket.on('changeVideo', (data) => {
    const vidId = data.id || data;
    const vidTitle = data.title || 'Trạm Nhạc Live';

    if (player) {
        if (typeof player.loadVideoById === 'function') {
            if (window.currentVideoId === vidId && typeof player.seekTo === 'function') {
                player.seekTo(0);
                if (typeof player.playVideo === 'function') player.playVideo();
            } else {
                player.loadVideoById(vidId);
            }
        } else {
            pendingVideoId = vidId;
        }
    }
    window.currentVideoId = vidId;
    initialVideoId = vidId;
    document.title = vidTitle;
    document.getElementById('welcome-title').innerText = vidTitle;
    fetchLyrics(vidTitle);
});
socket.on('stopVideo', () => {
    if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
    } else {
        pendingVideoId = null;
    }
    initialVideoId = '';
    window.currentVideoId = '';
    document.title = 'Trạm Nhạc Live';
    document.getElementById('welcome-title').innerText = 'Chưa có bài hát nào';
    document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Chưa có bài hát nào</div>';
    stopLyricSync();
});
socket.on('loopModeUpdate', (mode) => {
    isLoopMode = mode;
    updateLoopUI();
});

function toggleLoop() {
    socket.emit('adminToggleLoop');
}

function updateLoopUI() {
    const btn = document.getElementById('btn-loop');
    if (btn) {
        btn.classList.toggle('active', isLoopMode);
        btn.title = isLoopMode ? 'Chế độ lặp: BẬT 🔁' : 'Chế độ lặp: TẮT';
    }
}

function updatePlaylistUI(list) {
    const ui = document.getElementById('playlist-ui');
    if (list.length === 0) {
        ui.innerHTML = '<div>Chưa có bài nào chờ.</div>';
    } else {
        ui.innerHTML = list.map((song, i) => `
                    <div data-id="${i}" class="playlist-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); ${myRole === 'admin' ? 'cursor: grab;' : ''}">
                        <span class="song-idx" style="color: var(--text-muted); font-size: 12px; width: 20px;">${myRole === 'admin' ? '☰' : (i + 1)}</span>
                        <img src="${song.thumbnail}" alt="thumb" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
                        <div class="song-info" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                            <span class="song-title" title="${escapeHtml(song.title)}" style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(song.title)}</span>
                            <span class="song-id-text" style="font-size: 11px; color: var(--text-muted);">
                                Thêm bởi: <strong style="color: ${escapeHtml(song.addedByColor || '#aaaaaa')}">${escapeHtml(song.addedBy || 'Ẩn danh')}</strong>
                            </span>
                        </div>
                        ${myRole === 'admin' ? `<button style="background: none; color: red; border: none; border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; display: flex; align-items: center; justify-content: center;" onclick="removeSong(${i})"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>` : ''}
                    </div>
                `).join('');
    }

    if (myRole === 'admin' && typeof Sortable !== 'undefined' && list.length > 1) {
        if (window.playlistSortable) {
            window.playlistSortable.destroy();
        }
        window.playlistSortable = new Sortable(ui, {
            animation: 150,
            handle: '.playlist-item',
            onEnd: function (evt) {
                const newPlaylist = [];
                const items = ui.querySelectorAll('.playlist-item');
                items.forEach(item => {
                    const oldIndex = parseInt(item.getAttribute('data-id'));
                    newPlaylist.push(list[oldIndex]);
                });
                socket.emit('adminReorderPlaylist', newPlaylist);
            }
        });
    }
}

function forceSync() {
    if (player && player.playVideo) {
        player.playVideo();
        socket.emit('requestSync');
        const btn = document.getElementById('sync-btn');
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;vertical-align:text-bottom;margin-right:4px;">sync</span>';
        btn.classList.remove('active');
    }
}

socket.on('memberRequestSync', () => {
    if (myRole === 'admin' && player) {
        const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING || state === YT.PlayerState.UNSTARTED) {
            socket.emit('adminPlay', player.getCurrentTime());
        } else if (state === YT.PlayerState.PAUSED) {
            socket.emit('adminPause');
        }
    }
});

socket.on('memberPlay', (time) => {
    if (player) {
        let isLive = false;
        try {
            const duration = typeof player.getDuration === 'function' ? player.getDuration() : 0;
            isLive = duration === 0 || (player.getVideoData && player.getVideoData().isLive);
        } catch (e) { }

        let state = -1;
        try {
            state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
        } catch (e) { }

        let diff = 0;
        try {
            diff = Math.abs(player.getCurrentTime() - time);
        } catch (e) { }

        if (diff > 1.5 && !isLive) {
            window.ignoreNextStateChange = true;
            window.lastSyncTime = Date.now();
            if (typeof player.seekTo === 'function') player.seekTo(time);
        }

        if (state !== YT.PlayerState.PLAYING) {
            window.ignoreNextStateChange = true;
            window.lastSyncTime = Date.now();
            player.playVideo();
        }
    }
});

socket.on('memberPause', () => {
    if (player) {
        const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
        if (state !== YT.PlayerState.PAUSED) {
            window.ignoreNextStateChange = true;
            window.lastSyncTime = Date.now();
            player.pauseVideo();
        }
    }
});


function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const EMOJI_DATA = {
    'Mặt cười': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡'],
    'Cảm xúc': ['😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    'Cử chỉ': ['👋', '🤚', '🖐', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛'],
    'Trái tim': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'Thú vật': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉'],
    'Đồ ăn': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰'],
    'Hoạt động': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🎮', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸'],
    'Biểu tượng': ['💯', '🔥', '✨', '🌟', '💫', '⭐', '🎉', '🎊', '🏆', '🥇', '🏅', '🎖', '🎗', '🎁', '💰', '💎', '🔔', '📢', '💬', '💭', '🗯', '♥️', '♠️', '♣️', '♦️']
};

let pickerVisible = false;
let currentPickerTab = 'emoji';
let gifSearchTimeout = null;

function populateEmojiGrid() {
    const grid = document.getElementById('emoji-panel');
    let html = '';
    for (const [category, emojis] of Object.entries(EMOJI_DATA)) {
        html += `<div class="emoji-category-label">${category}</div>`;
        for (const emoji of emojis) {
            html += `<div class="emoji-item" onclick="insertEmoji('${emoji}')">${emoji}</div>`;
        }
    }
    grid.innerHTML = html;
}

function insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + emoji.length;
}

function togglePicker() {
    const popup = document.getElementById('picker-popup');
    const btn = document.getElementById('emoji-toggle-btn');
    pickerVisible = !pickerVisible;
    popup.classList.toggle('hidden', !pickerVisible);
    btn.classList.toggle('active', pickerVisible);
    if (pickerVisible && currentPickerTab === 'gif') {
        loadTrendingGifs();
    }
}

function switchPickerTab(tab) {
    currentPickerTab = tab;
    document.getElementById('tab-emoji').classList.toggle('active', tab === 'emoji');
    document.getElementById('tab-gif').classList.toggle('active', tab === 'gif');
    document.getElementById('emoji-panel').classList.toggle('hidden', tab !== 'emoji');
    document.getElementById('gif-panel').classList.toggle('hidden', tab !== 'gif');
    if (tab === 'gif') {
        loadTrendingGifs();
        document.getElementById('gif-search-input').focus();
    }
}

document.addEventListener('click', (e) => {
    const popup = document.getElementById('picker-popup');
    const toggleBtn = document.getElementById('emoji-toggle-btn');
    if (pickerVisible && !popup.contains(e.target) && e.target !== toggleBtn) {
        pickerVisible = false;
        popup.classList.add('hidden');
        toggleBtn.classList.remove('active');
    }
});


const KLIPY_API_KEY = '0Y7PJdRTbgPWV1aGkzA6FwklXAW5osXemiX4dFr4aJrgtxO4QF4E40Pc6WdEDzRS';
let trendingLoaded = false;

function loadTrendingGifs() {
    if (trendingLoaded) return;
    const results = document.getElementById('gif-results');
    results.innerHTML = '<div class="gif-results-loading">🔄 Đang tải GIF xu hướng...</div>';
    fetch(`https://api.klipy.com/v2/featured?key=${KLIPY_API_KEY}&limit=20&media_filter=tinygif,gif`)
        .then(r => r.json())
        .then(data => {
            trendingLoaded = true;
            renderGifResults(data.results || []);
        })
        .catch(() => {
            results.innerHTML = '<div class="gif-results-loading">Không thể tải GIF. Hãy thử tìm kiếm!</div>';
        });
}

function debouncedGifSearch() {
    clearTimeout(gifSearchTimeout);
    gifSearchTimeout = setTimeout(searchGifs, 400);
}

function searchGifs() {
    const query = document.getElementById('gif-search-input').value.trim();
    const results = document.getElementById('gif-results');
    if (!query) {
        trendingLoaded = false;
        loadTrendingGifs();
        return;
    }
    results.innerHTML = '<div class="gif-results-loading">🔍 Đang tìm kiếm...</div>';
    fetch(`https://api.klipy.com/v2/search?key=${KLIPY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&media_filter=tinygif,gif`)
        .then(r => r.json())
        .then(data => renderGifResults(data.results || []))
        .catch(() => {
            results.innerHTML = '<div class="gif-results-loading">Lỗi tìm kiếm GIF ❌</div>';
        });
}

function renderGifResults(gifs) {
    const results = document.getElementById('gif-results');
    if (gifs.length === 0) {
        results.innerHTML = '<div class="gif-results-loading">Không tìm thấy GIF nào 😢</div>';
        return;
    }
    results.innerHTML = gifs.map(gif => {
        const tinyUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || '';
        const fullUrl = gif.media_formats?.gif?.url || tinyUrl;
        return `<div class="gif-result-item" onclick="sendGif('${escapeHtml(fullUrl)}')">
                    <img src="${escapeHtml(tinyUrl)}" alt="GIF" loading="lazy">
                </div>`;
    }).join('');
}

function sendGif(gifUrl) {
    socket.emit('sendMessage', { type: 'gif', gifUrl: gifUrl });
    pickerVisible = false;
    document.getElementById('picker-popup').classList.add('hidden');
    document.getElementById('emoji-toggle-btn').classList.remove('active');
}

populateEmojiGrid();


let inlineSuggestTimeout = null;
let lastSuggestQuery = '';

function onChatInputChange() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (pickerVisible) return;

    if (!text || text.length < 2) {
        hideGifSuggestions();
        lastSuggestQuery = '';
        return;
    }

    const words = text.split(/\s+/);
    const query = words[words.length - 1];

    if (query.length < 2 || query === lastSuggestQuery) return;
    lastSuggestQuery = query;

    clearTimeout(inlineSuggestTimeout);
    inlineSuggestTimeout = setTimeout(() => fetchInlineGifs(query), 350);
}

function fetchInlineGifs(query) {
    fetch(`https://api.klipy.com/v2/search?key=${KLIPY_API_KEY}&q=${encodeURIComponent(query)}&limit=10&media_filter=tinygif,gif`)
        .then(r => r.json())
        .then(data => {
            const gifs = data.results || [];
            if (gifs.length > 0) {
                showGifSuggestions(gifs);
            } else {
                hideGifSuggestions();
            }
        })
        .catch(() => hideGifSuggestions());
}

function showGifSuggestions(gifs) {
    const strip = document.getElementById('gif-suggest-strip');
    strip.innerHTML = '<div class="gif-suggest-label"></div>' +
        gifs.map(gif => {
            const tinyUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || '';
            const fullUrl = gif.media_formats?.gif?.url || tinyUrl;
            return `<div class="gif-suggest-item" onclick="sendInlineGif('${escapeHtml(fullUrl)}')">
                        <img src="${escapeHtml(tinyUrl)}" alt="GIF" loading="lazy">
                    </div>`;
        }).join('');
    strip.classList.add('active');
    strip.scrollLeft = 0;
}

function hideGifSuggestions() {
    const strip = document.getElementById('gif-suggest-strip');
    strip.classList.remove('active');
    strip.innerHTML = '';
    lastSuggestQuery = '';
}

function sendInlineGif(gifUrl) {
    socket.emit('sendMessage', { type: 'gif', gifUrl: gifUrl });
    document.getElementById('chat-input').value = '';
    hideGifSuggestions();
}


let chatBubbleOpen = false;
let unreadCount = 0;

function switchRightTab(tabName) {
    const tabChat = document.getElementById('tab-chat');
    const tabLyric = document.getElementById('tab-lyric');
    const chatArea = document.getElementById('chat-area-container');
    const lyricArea = document.getElementById('lyric-area-container');
    const chatFab = document.getElementById('chat-bubble-btn');
    const lyricFab = document.getElementById('lyric-bubble-btn');

    if (tabName === 'chat') {
        tabChat.style.fontWeight = '600';
        tabChat.style.color = 'var(--accent)';
        tabLyric.style.fontWeight = '500';
        tabLyric.style.color = 'var(--text-muted)';
        chatArea.classList.remove('hidden');
        lyricArea.classList.add('hidden');
        if (chatFab) chatFab.classList.add('active-tab');
        if (lyricFab) lyricFab.classList.remove('active-tab');
    } else {
        tabLyric.style.fontWeight = '600';
        tabLyric.style.color = 'var(--accent)';
        tabChat.style.fontWeight = '500';
        tabChat.style.color = 'var(--text-muted)';
        lyricArea.classList.remove('hidden');
        chatArea.classList.add('hidden');
        if (chatFab) chatFab.classList.remove('active-tab');
        if (lyricFab) lyricFab.classList.add('active-tab');
    }
}

function toggleLyricBubble() {
    const chatPanel = document.querySelector('.right-column');
    if (chatBubbleOpen && document.getElementById('lyric-area-container').classList.contains('hidden')) {
        // Chat is open, but looking at chat -> switch to lyric
        switchRightTab('lyric');
    } else if (chatBubbleOpen) {
        // Lyric is open -> close entirely
        toggleChatBubble();
    } else {
        // Closed -> open and switch to lyric
        toggleChatBubble();
        switchRightTab('lyric');
    }
}


let fabExpanded = false;

function toggleFabMenu() {
    if (chatBubbleOpen) {
        toggleChatBubble();
        return;
    }

    fabExpanded = !fabExpanded;
    const container = document.getElementById('mobile-fab-menu');
    const toggleIcon = document.getElementById('fab-toggle-icon');
    const toggleBtn = document.getElementById('main-fab-toggle');

    if (fabExpanded) {
        container.classList.add('expanded');
        toggleIcon.style.transform = 'rotate(90deg)';
        toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    } else {
        container.classList.remove('expanded');
        toggleIcon.style.transform = 'rotate(0deg)';
        toggleBtn.style.background = 'var(--accent)';
    }
}

function toggleChatBubble() {
    chatBubbleOpen = !chatBubbleOpen;
    const chatPanel = document.querySelector('.right-column');
    const bubbleBtn = document.getElementById('chat-bubble-btn');
    const lyricBtn = document.getElementById('lyric-bubble-btn');

    const fabContainer = document.getElementById('mobile-fab-menu');
    const toggleBtn = document.getElementById('main-fab-toggle');
    const toggleIcon = document.getElementById('fab-toggle-icon');

    if (chatBubbleOpen) {
        chatPanel.classList.add('chat-open');
        if (bubbleBtn) bubbleBtn.classList.add('chat-is-open');

        // Collapse menu if open
        fabExpanded = false;
        if (fabContainer) fabContainer.classList.remove('expanded');
        // Change main FAB to Close icon
        if (toggleIcon) {
            toggleIcon.textContent = 'close';
            toggleIcon.style.transform = 'rotate(90deg)';
        }
        if (toggleBtn) toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';

        unreadCount = 0;
        updateChatBadge();
        const chatBox = document.getElementById('chat-box-ui');
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 100);
        setTimeout(() => { document.getElementById('chat-input').focus(); }, 200);
        
        // Add mobile-mini to trigger mini player on mobile
        document.getElementById('left-column').classList.add('mobile-mini');
    } else {
        chatPanel.classList.remove('chat-open');
        if (bubbleBtn) bubbleBtn.classList.remove('chat-is-open');
        if (bubbleBtn) bubbleBtn.classList.remove('active-tab');
        if (lyricBtn) lyricBtn.classList.remove('active-tab');

        // Revert main FAB to Menu icon
        if (toggleIcon) {
            toggleIcon.textContent = 'menu';
            toggleIcon.style.transform = 'rotate(0deg)';
        }
        if (toggleBtn) toggleBtn.style.background = 'var(--accent)';
        
        // Remove mobile-mini
        document.getElementById('left-column').classList.remove('mobile-mini');
    }
}

function updateChatBadge() {
    const badge = document.getElementById('chat-badge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden-badge');
    } else {
        badge.classList.add('hidden-badge');
    }
}

const DRAW_COLORS = [
    '#000000', '#495057', '#adb5bd', '#ffffff',
    '#e03131', '#f03e3e', '#e64980', '#c2255c',
    '#9c36b5', '#6741d9', '#3b5bdb', '#1c7ed6',
    '#15aabf', '#0ca678', '#2b8a3e', '#5c940d',
    '#82c91e', '#fcc419', '#ff922b', '#e67700',
    '#d9480f', '#8b4513'
];
let drawColor = '#000000', drawSize = 6, isEraser = false, isDrawing = false;
let drawLastX = 0, drawLastY = 0;
let amIDrawer = false;
let drawGameActive = false;
let drawGuessedCorrectly = false;


(function initDrawColors() {
    const container = document.getElementById('draw-colors');
    container.innerHTML = DRAW_COLORS.map((c, i) =>
        `<button class="draw-color-btn${i === 0 ? ' active' : ''}" style="background:${c}${c === '#ffffff' ? ';border:1px solid #ccc' : ''}" onclick="setDrawColor('${c}',this)"></button>`
    ).join('');
})();

function setDrawColor(c, btn) {
    drawColor = c; isEraser = false;
    document.getElementById('eraser-btn').classList.remove('active');
    document.querySelectorAll('.draw-color-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
function setDrawSize(s, btn) {
    drawSize = s;
    document.querySelectorAll('.draw-size-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
function toggleEraser() {
    isEraser = !isEraser;
    document.getElementById('eraser-btn').classList.toggle('active', isEraser);
}

function getDrawCanvas() { return document.getElementById('draw-canvas'); }
function getDrawCtx() {
    const c = getDrawCanvas();
    const ctx = c.getContext('2d');
    if (c.width !== c.offsetWidth || c.height !== c.offsetHeight) {
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        c.width = c.offsetWidth; c.height = c.offsetHeight;
        ctx.putImageData(imgData, 0, 0);
    }
    return ctx;
}
function resizeDrawCanvas() {
    const c = getDrawCanvas();
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
}

function drawLine(x0, y0, x1, y1, color, size) {
    const ctx = getDrawCtx();
    ctx.beginPath();
    ctx.moveTo(x0 * getDrawCanvas().width, y0 * getDrawCanvas().height);
    ctx.lineTo(x1 * getDrawCanvas().width, y1 * getDrawCanvas().height);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
}

function getCanvasPos(e) {
    const c = getDrawCanvas(); const r = c.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
}

function onDrawStart(e) {
    if (!amIDrawer) return;
    e.preventDefault(); isDrawing = true;
    const pos = getCanvasPos(e); drawLastX = pos.x; drawLastY = pos.y;
}
function onDrawMove(e) {
    if (!amIDrawer || !isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const c = isEraser ? '#ffffff' : drawColor;
    const s = isEraser ? drawSize * 3 : drawSize;
    drawLine(drawLastX, drawLastY, pos.x, pos.y, c, s);
    socket.emit('drawStroke', { x0: drawLastX, y0: drawLastY, x1: pos.x, y1: pos.y, color: c, size: s });
    drawLastX = pos.x; drawLastY = pos.y;
}
function onDrawEnd(e) { isDrawing = false; }


const dc = getDrawCanvas();
dc.addEventListener('mousedown', onDrawStart);
dc.addEventListener('mousemove', onDrawMove);
dc.addEventListener('mouseup', onDrawEnd);
dc.addEventListener('mouseleave', onDrawEnd);
dc.addEventListener('touchstart', onDrawStart, { passive: false });
dc.addEventListener('touchmove', onDrawMove, { passive: false });
dc.addEventListener('touchend', onDrawEnd);

function clearDrawCanvas() {
    resizeDrawCanvas();
    socket.emit('drawClear');
}

function startDrawGame() { socket.emit('adminStartDrawGame'); }
function endDrawGame() { socket.emit('adminEndDrawGame'); }
function skipDrawWord() { socket.emit('skipWord'); }
function pickDrawer(id) { socket.emit('adminPickDrawer', id); }
function randomPickDrawer() { socket.emit('adminRandomPickDrawer'); }

function renderDrawScores(scores) {
    const el = document.getElementById('draw-scores');
    const arr = Object.values(scores).sort((a, b) => b.score - a.score);
    if (arr.length === 0) { el.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">Chưa có điểm</span>'; return; }
    el.innerHTML = arr.map(s => `<div class="draw-score-item"><span style="color:${escapeHtml(s.nameColor)}">${escapeHtml(s.name)}</span><span class="draw-score-pts">${s.score}đ</span></div>`).join('');
}
function renderDrawUserList(users) {
    const el = document.getElementById('draw-user-list');
    if (myRole !== 'admin') { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:10px;">Chờ admin chọn người vẽ...</div>'; return; }
    el.innerHTML = users.map(u => `<button class="draw-user-btn" style="color:${escapeHtml(u.nameColor)}" onclick="pickDrawer('${u.id}')">${escapeHtml(u.name)}</button>`).join('');
}
function showDrawPanel(panel) {
    document.getElementById('draw-waiting-panel').classList.toggle('hidden', panel !== 'waiting');
    document.getElementById('draw-canvas-panel').classList.toggle('hidden', panel !== 'canvas');
    document.getElementById('draw-round-result').classList.toggle('hidden', panel !== 'result');
    document.getElementById('draw-random-panel').classList.toggle('hidden', panel !== 'random');

    if (panel === 'waiting') {
        document.getElementById('draw-random-btn-container').classList.toggle('hidden', myRole !== 'admin');
    }
}


socket.on('drawGameStarted', (data) => {
    drawGameActive = true; amIDrawer = false; drawGuessedCorrectly = false;
    document.getElementById('draw-game-overlay').classList.remove('hidden');
    if (myRole === 'admin') document.getElementById('draw-admin-tools-header').classList.remove('hidden');
    document.getElementById('draw-drawer-tools').classList.add('hidden');
    document.getElementById('draw-guess-area').classList.add('hidden');
    showDrawPanel('waiting');
    renderDrawUserList(data.users);
    renderDrawScores(data.scores || {});
    document.getElementById('draw-info').innerHTML = '<div>👆 Chọn người vẽ để bắt đầu!</div>';
    document.getElementById('draw-timer').textContent = '--';
    document.getElementById('draw-timer').classList.remove('urgent');
});


socket.on('drawRoundStart', (data) => {
    amIDrawer = (data.drawerId === socket.id);
    drawGuessedCorrectly = false;
    showDrawPanel('canvas');
    resizeDrawCanvas();
    document.getElementById('draw-tools-bar').classList.toggle('hidden', !amIDrawer);
    document.getElementById('draw-timer').textContent = data.timeLeft + 's';
    document.getElementById('draw-timer').classList.remove('urgent');


    document.getElementById('draw-drawer-tools').classList.toggle('hidden', !amIDrawer);


    const guessArea = document.getElementById('draw-guess-area');
    guessArea.classList.toggle('hidden', amIDrawer);
    document.getElementById('draw-guess-input').value = '';
    document.getElementById('draw-guess-input').disabled = false;
    document.getElementById('draw-guess-input').placeholder = 'Nhập câu trả lời của bạn...';
    document.getElementById('draw-guess-feedback').textContent = '';
    document.getElementById('draw-guess-feedback').className = 'draw-guess-feedback';

    if (amIDrawer) {
        document.getElementById('draw-info').innerHTML = `<div>Bạn đang vẽ! <span class="draw-word-secret"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:text-bottom;">lock</span> Chờ nhận từ...</span></div>`;
    } else {
        document.getElementById('draw-info').innerHTML = `<div><span class="material-symbols-outlined" style="font-size:16px;vertical-align:text-bottom;">brush</span> <strong>${escapeHtml(data.drawerName)}</strong> đang vẽ... <div class="draw-word-display">${data.hint}</div></div>`;
        setTimeout(() => document.getElementById('draw-guess-input').focus(), 300);
    }
});


socket.on('drawYourWord', (word) => {
    document.getElementById('draw-info').innerHTML = `<div>Bạn đang vẽ! <span class="draw-word-secret"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:text-bottom;">palette</span> ${escapeHtml(word).toUpperCase()}</span></div>`;
});


socket.on('drawTimerUpdate', (t) => {
    const el = document.getElementById('draw-timer');
    el.textContent = t + 's';
    el.classList.toggle('urgent', t <= 15);
});


socket.on('drawStroke', (data) => { drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size); });


socket.on('drawClear', () => { resizeDrawCanvas(); });


socket.on('drawNewWord', (data) => {
    resizeDrawCanvas();
    if (!amIDrawer) {
        const info = document.getElementById('draw-info');
        const current = info.innerHTML;
        info.innerHTML = current.replace(/<div class="draw-word-display">.*?<\/div>/, `<div class="draw-word-display">${data.hint}</div>`);
    }
    document.getElementById('draw-timer').textContent = data.timeLeft + 's';
    document.getElementById('draw-timer').classList.remove('urgent');
});


socket.on('drawScoreUpdate', (scores) => { renderDrawScores(scores); });


socket.on('drawRoundEnd', (data) => {
    amIDrawer = false;
    showDrawPanel('result');
    document.getElementById('draw-drawer-tools').classList.add('hidden');
    document.getElementById('draw-tools-bar').classList.add('hidden');
    document.getElementById('draw-guess-area').classList.add('hidden');
    document.getElementById('draw-round-result').innerHTML = `<h3><span class="material-symbols-outlined" style="font-size:24px;vertical-align:text-bottom;">timer</span> Hết lượt!</h3><div class="reveal-word">Đáp án: ${escapeHtml(data.word)}</div>`;
    document.getElementById('draw-info').innerHTML = '<div>Chờ lượt tiếp theo...</div>';
    renderDrawScores(data.scores);
});


socket.on('drawWaitingForDrawer', (data) => {
    showDrawPanel('waiting');
    document.getElementById('draw-guess-area').classList.add('hidden');
    renderDrawUserList(data.users);
    renderDrawScores(data.scores);
    document.getElementById('draw-info').innerHTML = '<div>👆 Chọn người vẽ tiếp theo!</div>';
    document.getElementById('draw-timer').textContent = '--';
    document.getElementById('draw-timer').classList.remove('urgent');
});


socket.on('drawRandomPickAnimation', (data) => {
    showDrawPanel('random');
    document.getElementById('draw-info').innerHTML = '<div>Đang tìm kiếm người may mắn...</div>';
    const nameEl = document.getElementById('draw-random-name');
    const users = data.users;
    const winner = users.find(u => u.id === data.winnerId);

    let i = 0;
    const interval = setInterval(() => {
        const u = users[i % users.length];
        nameEl.textContent = u.name;
        nameEl.style.color = u.nameColor || 'var(--text-main)';

        nameEl.classList.remove('draw-random-name');
        void nameEl.offsetWidth;
        nameEl.classList.add('draw-random-name');
        i++;
    }, 100);

    setTimeout(() => {
        clearInterval(interval);
        if (winner) {
            nameEl.textContent = winner.name;
            nameEl.style.color = winner.nameColor || 'var(--accent)';
        }
    }, 2500);
});


socket.on('drawUsersUpdate', (users) => {
    if (drawGameActive && document.getElementById('draw-waiting-panel') && !document.getElementById('draw-waiting-panel').classList.contains('hidden')) {
        renderDrawUserList(users);
    }
});


socket.on('drawGameEnded', () => {
    drawGameActive = false; amIDrawer = false;
    document.getElementById('draw-game-overlay').classList.add('hidden');
    document.getElementById('draw-admin-tools-header').classList.add('hidden');
    document.getElementById('draw-drawer-tools').classList.add('hidden');
});


socket.on('drawCanvasHistory', (history) => {
    resizeDrawCanvas();
    history.forEach(s => drawLine(s.x0, s.y0, s.x1, s.y1, s.color, s.size));
});


function sendDrawGuess() {
    if (drawGuessedCorrectly) return;
    const input = document.getElementById('draw-guess-input');
    const guess = input.value.trim();
    if (!guess) return;
    socket.emit('sendMessage', guess);
    input.value = '';
    input.focus();
}


(function () {
    const origHandler = socket.listeners('newMessage').find(f => true);
    socket.on('newMessage', (data) => {
        if (drawGameActive && data.role === 'system' && data.name === 'Trò chơi 🎨' && data.text.includes(myUsername) && data.text.includes('đoán đúng')) {
            drawGuessedCorrectly = true;
            const fb = document.getElementById('draw-guess-feedback');
            fb.textContent = '✅ Bạn đã đoán đúng!';
            fb.className = 'draw-guess-feedback correct';
            document.getElementById('draw-guess-input').disabled = true;
            document.getElementById('draw-guess-input').placeholder = 'Đã đoán đúng! 🎉';
        }
    });
})();

let myChessSide = null;
let currentChessGame = null;
let localChess = new Chess();
let chessSelectedSquare = null;

const pieceUnicode = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
};

function openChessGame() { document.getElementById('chess-game-overlay').classList.remove('hidden'); }
function closeChessGame() { document.getElementById('chess-game-overlay').classList.add('hidden'); }

function sendChessChallenge() {
    const targetId = document.getElementById('chess-challenge-target').value;
    if (!targetId) { alert('Vui lòng chọn một đối thủ để thách đấu!'); return; }
    socket.emit('chessChallenge', targetId);
}
function leaveChess() { socket.emit('chessLeave'); }

let currentChallengerId = null;
socket.on('chessChallengeReceived', ({ challengerId, challengerName }) => {
    currentChallengerId = challengerId;
    document.getElementById('chess-challenger-name').innerText = challengerName;
    document.getElementById('chess-challenge-modal').classList.remove('hidden');
});

function respondChessChallenge(accept) {
    document.getElementById('chess-challenge-modal').classList.add('hidden');
    if (currentChallengerId) {
        socket.emit('chessChallengeRespond', { challengerId: currentChallengerId, accept });
        if (accept) openChessGame();
        currentChallengerId = null;
    }
}

socket.on('activeUsersList', (users) => {
    ['chess-challenge-target', 'caro-challenge-target'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const prevVal = select.value;
            select.innerHTML = '<option value="">-- Chọn đối thủ --</option>';
            users.forEach(u => {
                if (u.id !== socket.id) {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.innerText = u.name;
                    select.appendChild(opt);
                }
            });
            if (Array.from(select.options).some(o => o.value === prevVal)) {
                select.value = prevVal;
            }
        }
    });
});

function onChessSquareClick(square) {
    if (!currentChessGame || currentChessGame.winner) return;
    if (myChessSide !== (localChess.turn() === 'w' ? 'W' : 'B')) return;

    const piece = localChess.get(square);

    if (chessSelectedSquare) {

        const move = localChess.move({
            from: chessSelectedSquare,
            to: square,
            promotion: 'q'
        });

        if (move) {

            chessSelectedSquare = null;
            let winner = null;
            if (localChess.in_checkmate()) winner = localChess.turn() === 'w' ? 'b' : 'w';
            else if (localChess.in_draw() || localChess.in_stalemate()) winner = 'd';

            socket.emit('chessMove', { fen: localChess.fen(), winner });
            renderChessBoard();
        } else {

            if (piece && piece.color === localChess.turn()) {
                chessSelectedSquare = square;
                renderChessBoard();
            } else {
                chessSelectedSquare = null;
                renderChessBoard();
            }
        }
    } else {
        if (piece && piece.color === localChess.turn()) {
            chessSelectedSquare = square;
            renderChessBoard();
        }
    }
}

function renderChessBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';


    const ranks = myChessSide === 'B' ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = myChessSide === 'B' ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];


    let validMoves = [];
    if (chessSelectedSquare) {
        validMoves = localChess.moves({ square: chessSelectedSquare, verbose: true }).map(m => m.to);
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = files[c] + ranks[r];
            const cell = document.createElement('div');
            cell.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
            if (square === chessSelectedSquare) cell.classList.add('selected');
            if (validMoves.includes(square)) cell.classList.add('highlight');

            const piece = localChess.get(square);
            if (piece) {
                cell.innerText = pieceUnicode[piece.type];
                if (piece.color === 'w') {
                    cell.style.color = '#ffffff';
                    cell.style.textShadow = '0 1px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.8)';
                } else {
                    cell.style.color = '#000000';
                    cell.style.textShadow = '0 1px 2px rgba(255,255,255,0.4)';
                }
            }

            cell.onclick = () => onChessSquareClick(square);
            boardEl.appendChild(cell);
        }
    }
}

socket.on('chessUpdate', (game) => {
    currentChessGame = game;
    myChessSide = (game.playerW === socket.id) ? 'W' : (game.playerB === socket.id ? 'B' : null);
    localChess.load(game.fen);
    chessSelectedSquare = null;

    const isPlaying = game.playerW || game.playerB;

    document.getElementById('chess-challenge-target').classList.toggle('hidden', isPlaying || myChessSide !== null);
    document.getElementById('btn-send-challenge').classList.toggle('hidden', isPlaying || myChessSide !== null);
    document.getElementById('btn-leave-chess').classList.toggle('hidden', myChessSide === null && myRole !== 'admin');

    document.getElementById('chess-board-wrapper').classList.toggle('hidden', !isPlaying);

    let status = '';
    if (game.winner) {
        if (game.winner === 'd') status = `🤝 TRẬN HÒA!`;
        else status = `🎉 <span style="color: ${game.winner === 'w' ? '#fff' : '#aaa'};">${game.winner === 'w' ? game.playerWName : game.playerBName} (${game.winner === 'w' ? 'Trắng' : 'Đen'})</span> ĐÃ CHIẾN THẮNG!`;
    } else if (!game.playerW || !game.playerB) {
        status = `Chọn một đối thủ trong phòng để Thách đấu Cờ Vua<br><span style="font-size: 13px; color: var(--text-muted); font-weight: 400; display: inline-block; margin-top: 8px;">Khán giả có thể theo dõi trực tiếp trận đấu</span>`;
    } else {
        const turnStr = localChess.turn() === 'w' ? 'W' : 'B';
        const isMyTurn = myChessSide === turnStr;
        status = `Lượt của: <span style="color: ${turnStr === 'W' ? '#fff' : '#aaa'};">${turnStr === 'W' ? game.playerWName : game.playerBName} (${turnStr === 'W' ? 'Trắng' : 'Đen'})</span> ${isMyTurn ? '(Đến lượt bạn!)' : ''}`;
    }
    document.getElementById('chess-status').innerHTML = status;

    renderChessBoard();
});


let currentLyricData = null;
let lyricInterval = null;
let parsedLyrics = [];

async function fetchLyrics(title) {
    document.getElementById('lyric-box').classList.remove('hidden');
    document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Đang tìm lời bài hát...</div>';

    try {
        let cleanTitle = title.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ')
            .replace(/\b(official|music video|lyric|lyrics|audio|mv|vietsub|4k|hd|studio version)\b/gi, ' ')
            .replace(/[-|~"']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleanTitle.length < 2) cleanTitle = title.split('-')[0].trim();

        console.log("--- LYRIC SEARCH DEBUG ---");
        console.log("Original Title:", title);
        console.log("Clean Title for Search:", cleanTitle);
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
        console.log("API URL:", searchUrl);

        let res = await fetch(searchUrl);
        let data = await res.json();

        console.log("Results found:", data ? data.length : 0);

        if ((!data || data.length === 0) && cleanTitle.match(/\b(ft|feat)\b/i)) {
            let noFeatTitle = cleanTitle.replace(/\b(ft\.?|feat\.?)\b.*/gi, '').trim();
            console.log("Retry without 'feat':", noFeatTitle);
            res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(noFeatTitle)}`);
            data = await res.json();
            console.log("Retry Results found:", data ? data.length : 0);
        }

        if (data && data.length > 0) {
            console.log(`First API Result: ${data[0].trackName} - ${data[0].artistName} (Duration: ${data[0].duration}s)`);

            let videoDuration = 0;
            for (let i = 0; i < 15; i++) {
                if (player && typeof player.getDuration === 'function') {
                    videoDuration = player.getDuration();
                    if (videoDuration > 0) break;
                }
                await new Promise(r => setTimeout(r, 200));
            }

            console.log("YouTube Video Duration:", videoDuration, "seconds");

            let found = null;
            if (videoDuration > 0) {
                let minDiff = Infinity;
                for (let item of data) {
                    if (item.syncedLyrics && item.duration) {
                        let diff = Math.abs(item.duration - videoDuration);
                        if (diff < minDiff) {
                            minDiff = diff;
                            found = item;
                        }
                    }
                }
                if (found) {
                    console.log(`Closest duration match found with diff: ${minDiff}s`);
                }
            }

            if (!found) {
                console.log("No duration info available, falling back to first synced lyrics...");
                found = data.find(item => item.syncedLyrics);
            }
            if (!found) {
                console.log("No synced lyrics found, falling back to first plain lyrics...");
                found = data[0];
            }

            if (found) {
                console.log(`Chosen Lyric: ${found.trackName} - ${found.artistName} (Duration: ${found.duration}s, Synced: ${!!found.syncedLyrics})`);
            }
            console.log("--------------------------");

            if (found.syncedLyrics) {
                parseLyrics(found.syncedLyrics);
                startLyricSync();
            } else if (found.plainLyrics) {
                document.getElementById('lyric-content').innerHTML = `<div style="white-space: pre-line; color: var(--text-muted); font-size: 15px;">${found.plainLyrics}</div>`;
                stopLyricSync();
            } else {
                document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Không tìm thấy lời bài hát</div>';
                stopLyricSync();
            }
        } else {
            document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Không tìm thấy lời bài hát</div>';
            stopLyricSync();
        }
    } catch (e) {
        console.error("Lỗi khi tải lyric", e);
        document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Lỗi khi tải lời bài hát</div>';
        stopLyricSync();
    }
}

function parseLyrics(lrc) {
    const lines = lrc.split('\n');
    parsedLyrics = [];
    let html = '';

    lines.forEach((line, index) => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0'));
            const time = min * 60 + sec + ms / 1000;
            const text = match[4].trim();
            if (text) {
                parsedLyrics.push({ time, text, index: parsedLyrics.length });
                html += `<div class="lyric-line" id="lyric-line-${parsedLyrics.length - 1}" onclick="seekLyric(${time})">${text}</div>`;
            }
        }
    });

    if (parsedLyrics.length === 0) {
        document.getElementById('lyric-content').innerHTML = '<div class="lyric-loading">Không thể đồng bộ lời bài hát</div>';
    } else {
        document.getElementById('lyric-content').innerHTML = html;
    }
}

function seekLyric(time) {
    if (myRole === 'admin' && player && typeof player.seekTo === 'function') {
        player.seekTo(time, true);
        socket.emit('adminPlay', time);
    }
}

function startLyricSync() {
    stopLyricSync();
    let lastScrolledIndex = -1;
    lyricInterval = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        const currentTime = player.getCurrentTime();

        let activeIndex = -1;
        for (let i = 0; i < parsedLyrics.length; i++) {
            if (currentTime >= parsedLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }

        if (activeIndex !== -1 && activeIndex !== lastScrolledIndex) {
            lastScrolledIndex = activeIndex;
            const target = document.getElementById(`lyric-line-${activeIndex}`);

            if (target) {
                const box = document.getElementById('lyric-box');
                const offsetTop = target.offsetTop - box.offsetTop;
                box.scrollTo({
                    top: offsetTop - 24,
                    behavior: 'smooth'
                });
            }
        }
    }, 200);
}

function stopLyricSync() {
    if (lyricInterval) {
        clearInterval(lyricInterval);
        lyricInterval = null;
    }
}

let myCaroSide = null;
let currentCaroGame = null;

function initCaroBoard() {
    const boardEl = document.getElementById('caro-board');
    boardEl.innerHTML = '';
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.createElement('div');
            cell.className = 'caro-cell';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.fontSize = '22px';
            cell.style.cursor = 'pointer';
            cell.style.userSelect = 'none';
            cell.id = `caro-cell-${r}-${c}`;
            cell.onclick = () => caroMove(r, c);
            boardEl.appendChild(cell);
        }
    }
}

function openCaroGame() { document.getElementById('caro-game-overlay').classList.remove('hidden'); }
function closeCaroGame() { document.getElementById('caro-game-overlay').classList.add('hidden'); }

function sendCaroChallenge() {
    const targetId = document.getElementById('caro-challenge-target').value;
    if (!targetId) { alert('Vui lòng chọn một đối thủ để thách đấu!'); return; }
    socket.emit('caroChallenge', targetId);
}
function leaveCaro() { socket.emit('caroLeave'); }

let currentCaroChallengerId = null;
socket.on('caroChallengeReceived', ({ challengerId, challengerName }) => {
    currentCaroChallengerId = challengerId;
    document.getElementById('caro-challenger-name').innerText = challengerName;
    document.getElementById('caro-challenge-modal').classList.remove('hidden');
});

function respondCaroChallenge(accept) {
    document.getElementById('caro-challenge-modal').classList.add('hidden');
    if (currentCaroChallengerId) {
        socket.emit('caroChallengeRespond', { challengerId: currentCaroChallengerId, accept });
        if (accept) openCaroGame();
        currentCaroChallengerId = null;
    }
}

function caroMove(r, c) {
    if (!currentCaroGame || currentCaroGame.winner) return;
    if (myCaroSide !== currentCaroGame.turn) return;
    if (currentCaroGame.board[r][c] !== null) return;
    socket.emit('caroMove', { row: r, col: c });
}

function updateCaroUI(game) {
    currentCaroGame = game;
    myCaroSide = (game.playerX === socket.id) ? 'X' : (game.playerO === socket.id ? 'O' : null);

    const isPlaying = game.playerX || game.playerO;

    document.getElementById('caro-challenge-target').classList.toggle('hidden', isPlaying || myCaroSide !== null);
    document.getElementById('btn-send-caro-challenge').classList.toggle('hidden', isPlaying || myCaroSide !== null);
    document.getElementById('btn-leave-caro').classList.toggle('hidden', myCaroSide === null && myRole !== 'admin');

    document.getElementById('caro-board-wrapper').classList.toggle('hidden', !isPlaying);

    let status = '';
    if (game.winner) {
        status = `🎉 <span style="color: ${game.winner === 'X' ? '#ff4757' : '#1e90ff'};">${game.winner === 'X' ? game.playerXName : game.playerOName} (${game.winner})</span> ĐÃ CHIẾN THẮNG!`;
    } else if (!game.playerX || !game.playerO) {
        status = `Chọn một đối thủ trong phòng để Thách đấu Cờ Caro<br><span style="font-size: 13px; color: var(--text-muted); font-weight: 400; display: inline-block; margin-top: 8px;">Khán giả có thể theo dõi trực tiếp trận đấu</span>`;
    } else {
        const isMyTurn = myCaroSide === game.turn;
        status = `Lượt của: <span style="color: ${game.turn === 'X' ? '#ff4757' : '#1e90ff'};">${game.turn === 'X' ? game.playerXName : game.playerOName} (${game.turn})</span> ${isMyTurn ? '(Đến lượt bạn!)' : ''}`;
    }
    document.getElementById('caro-status').innerHTML = status;

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.getElementById(`caro-cell-${r}-${c}`);
            if (cell) {
                const val = game.board[r][c];
                cell.innerText = val === 'X' ? '✕' : (val === 'O' ? '〇' : '');
                cell.className = 'caro-cell' + (val === 'X' ? ' x-cell' : (val === 'O' ? ' o-cell' : ''));
            }
        }
    }
}
socket.on('caroUpdate', updateCaroUI);

initCaroBoard();

// --- XIANGQI GAME (Cờ Tướng) ---
function openXiangqiGame() {
    document.getElementById('xiangqi-game-overlay').classList.remove('hidden');
    const select = document.getElementById('xiangqi-challenge-target');
    select.innerHTML = '<option value="">-- Chọn đối thủ --</option>';
    document.querySelectorAll('#draw-user-list .user-item').forEach(el => {
        const id = el.getAttribute('data-id');
        const name = el.innerText;
        if (id && id !== socket.id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.innerText = name;
            select.appendChild(opt);
        }
    });
}
function closeXiangqiGame() {
    document.getElementById('xiangqi-game-overlay').classList.add('hidden');
}
function sendXiangqiChallenge() {
    const target = document.getElementById('xiangqi-challenge-target').value;
    if (!target) return alert('Chọn một người để thách đấu!');
    socket.emit('xiangqiChallenge', target);
    document.getElementById('btn-send-xiangqi-challenge').classList.add('hidden');
    document.getElementById('btn-leave-xiangqi').classList.remove('hidden');
}
function respondXiangqiChallenge(accept) {
    document.getElementById('xiangqi-challenge-modal').classList.add('hidden');
    socket.emit('xiangqiChallengeRespond', { challengerId: window.currentXiangqiChallenger, accept });
    if (accept) openXiangqiGame();
}
function leaveXiangqi() {
    socket.emit('xiangqiLeave');
    document.getElementById('btn-leave-xiangqi').classList.add('hidden');
    document.getElementById('btn-send-xiangqi-challenge').classList.remove('hidden');
}

socket.on('xiangqiChallengeReceived', (data) => {
    window.currentXiangqiChallenger = data.challengerId;
    document.getElementById('xiangqi-challenger-name').innerText = data.challengerName;
    document.getElementById('xiangqi-challenge-modal').classList.remove('hidden');
});

// --- UNO GAME ---
function openUnoGame() {
    document.getElementById('uno-game-overlay').classList.remove('hidden');
}
function closeUnoGame() {
    document.getElementById('uno-game-overlay').classList.add('hidden');
}
function joinUnoGame() {
    socket.emit('unoJoin');
    document.getElementById('uno-players-list').innerText = "Đang tham gia...";
}
function startUnoGame() {
    socket.emit('unoStart');
}
function drawUnoCard() {
    socket.emit('unoDraw');
}

// --- MINI PLAYER DRAG LOGIC ---
const miniPlayer = document.getElementById('player-container');
const dragHandle = document.createElement('div');
dragHandle.style.position = 'absolute';
dragHandle.style.top = '0';
dragHandle.style.left = '0';
dragHandle.style.width = '100%';
dragHandle.style.height = '32px';
dragHandle.style.cursor = 'move';
dragHandle.style.zIndex = '50';
dragHandle.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)';
dragHandle.style.display = 'none';
dragHandle.innerHTML = '<div style="width: 40px; height: 4px; background: rgba(255,255,255,0.5); border-radius: 2px; margin: 6px auto;"></div>';
miniPlayer.appendChild(dragHandle);

let isDraggingMini = false;
let miniDragX = 0;
let miniDragY = 0;
let initialMiniX = 0;
let initialMiniY = 0;
let dragStartX = 0;
let dragStartY = 0;

// Show handle only in mini mode
const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        if (m.attributeName === 'class') {
            if (document.getElementById('left-column').classList.contains('not-home') || document.getElementById('left-column').classList.contains('mobile-mini')) {
                dragHandle.style.display = 'block';
            } else {
                dragHandle.style.display = 'none';
            }
        }
    });
});
observer.observe(document.getElementById('left-column'), { attributes: true });

function resetMiniPlayerDrag() {
    miniDragX = 0;
    miniDragY = 0;
    miniPlayer.style.transform = '';
}

dragHandle.addEventListener('mousedown', startMiniDrag);
dragHandle.addEventListener('touchstart', startMiniDrag, { passive: false });

function startMiniDrag(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    isDraggingMini = true;
    dragHandle.style.height = '100%'; // cover full player to not lose mouse
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    initialMiniX = miniDragX;
    initialMiniY = miniDragY;
    dragStartX = clientX;
    dragStartY = clientY;
    
    document.addEventListener('mousemove', onMiniDrag);
    document.addEventListener('mouseup', endMiniDrag);
    document.addEventListener('touchmove', onMiniDrag, { passive: false });
    document.addEventListener('touchend', endMiniDrag);
}

function onMiniDrag(e) {
    if (!isDraggingMini) return;
    e.preventDefault();
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;
    
    miniDragX = initialMiniX + dx;
    miniDragY = initialMiniY + dy;
    
    miniPlayer.style.transform = `translate(${miniDragX}px, ${miniDragY}px)`;
}

function endMiniDrag() {
    isDraggingMini = false;
    dragHandle.style.height = '32px';
    document.removeEventListener('mousemove', onMiniDrag);
    document.removeEventListener('mouseup', endMiniDrag);
    document.removeEventListener('touchmove', onMiniDrag);
    document.removeEventListener('touchend', endMiniDrag);
}