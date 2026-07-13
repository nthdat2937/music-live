import re

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'r') as f:
    content = f.read()

# HTML replacement
html_old = """        <div class="fab-menu-container" id="mobile-fab-menu">
            <button id="lyric-bubble-btn" class="fab-menu-btn" onclick="toggleLyricBubble()">
                <span class="material-symbols-outlined" style="font-size:24px;">lyrics</span>
            </button>
            <div class="fab-divider"></div>
            <button id="chat-bubble-btn" class="fab-menu-btn" onclick="toggleChatBubble()">
                <span class="bubble-icon-chat" style="display:flex;align-items:center;justify-content:center;"><span
                        class="material-symbols-outlined" style="font-size:24px;">chat</span></span>
                <span class="bubble-icon-close" style="display:flex;align-items:center;justify-content:center;"><span
                        class="material-symbols-outlined" style="font-size:24px;">close</span></span>
                <span id="chat-badge" class="chat-badge hidden-badge" style="top: -2px; right: -2px;">0</span>
            </button>
        </div>"""

html_new = """        <div class="fab-menu-container" id="mobile-fab-menu">
            <div class="fab-actions" id="fab-actions">
                <button id="lyric-bubble-btn" class="fab-menu-btn" onclick="toggleLyricBubble()">
                    <span class="material-symbols-outlined" style="font-size:24px;">lyrics</span>
                </button>
                <button id="chat-bubble-btn" class="fab-menu-btn" onclick="toggleChatBubble()">
                    <span class="bubble-icon-chat" style="display:flex;align-items:center;justify-content:center;"><span
                            class="material-symbols-outlined" style="font-size:24px;">chat</span></span>
                    <span id="chat-badge" class="chat-badge hidden-badge" style="top: -2px; right: -2px;">0</span>
                </button>
            </div>
            <button id="main-fab-toggle" class="fab-toggle-btn" onclick="toggleFabMenu()">
                <span id="fab-toggle-icon" class="material-symbols-outlined" style="font-size: 28px; transition: transform 0.3s;">menu</span>
            </button>
        </div>"""

if html_old in content:
    content = content.replace(html_old, html_new)
else:
    print("Warning: HTML part not found, checking regex.")
    content = re.sub(
        r'<div class="fab-menu-container" id="mobile-fab-menu">.*?</div>\s*</div>',
        html_new + '\n\n    </div>',
        content,
        flags=re.DOTALL
    )


# CSS replacement
css_old = """        /* Mobile FAB Menu */
        .fab-menu-container {
            display: flex;
            flex-direction: column;
            position: fixed;
            bottom: 84px;
            right: 20px;
            background: rgba(40, 40, 50, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            z-index: 400;
            padding: 4px;
            gap: 4px;
        }
        
        .fab-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 0 8px;
        }

        .fab-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 24px;
            background: transparent;
            color: white;
            border: none;
            cursor: pointer;
            transition: 0.2s;
            position: relative;
        }

        .fab-menu-btn:active {
            transform: scale(0.92);
            background: rgba(255, 255, 255, 0.1);
        }
        
        .fab-menu-btn.active-tab {
            background: var(--text-main);
            color: #0f0f0f;
        }
        
        .fab-menu-btn.chat-is-open {
            background: rgba(255, 255, 255, 0.12);
        }

        .fab-menu-btn.chat-is-open .bubble-icon-chat {
            display: none;
        }

        .fab-menu-btn.chat-is-open .bubble-icon-close {
            display: block;
        }

        .fab-menu-btn .bubble-icon-close {
            display: none;
        }"""

css_new = """        /* Mobile FAB Menu */
        .fab-menu-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: fixed;
            bottom: 84px;
            right: 20px;
            z-index: 400;
            gap: 12px;
        }
        
        .fab-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 0;
            transform: translateY(20px) scale(0.8);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: bottom center;
        }

        .fab-menu-container.expanded .fab-actions {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        
        .fab-toggle-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fab-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 24px;
            background: rgba(40, 40, 50, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            color: white;
            cursor: pointer;
            transition: 0.2s;
            position: relative;
        }

        .fab-menu-btn:active {
            transform: scale(0.92);
        }
        
        .fab-menu-btn.active-tab {
            background: var(--text-main);
            color: #0f0f0f;
        }"""

if css_old in content:
    content = content.replace(css_old, css_new)
else:
    print("Warning: CSS part not found")

# Insert JS function
js_insert = """
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
"""
if 'function toggleFabMenu()' not in content:
    content = content.replace('function toggleChatBubble() {', js_insert + '\n        function toggleChatBubble() {')

# Update JS in toggleChatBubble
js_chat_old = """        function toggleChatBubble() {
            chatBubbleOpen = !chatBubbleOpen;
            const chatPanel = document.querySelector('.right-column');
            const bubbleBtn = document.getElementById('chat-bubble-btn');
            const lyricBtn = document.getElementById('lyric-bubble-btn');

            if (chatBubbleOpen) {
                chatPanel.classList.add('chat-open');
                bubbleBtn.classList.add('chat-is-open');
                unreadCount = 0;"""

js_chat_new = """        function toggleChatBubble() {
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

                unreadCount = 0;"""

if js_chat_old in content:
    content = content.replace(js_chat_old, js_chat_new)
else:
    print("Warning: JS chat bubble part not found")
    
js_chat_old2 = """            } else {
                chatPanel.classList.remove('chat-open');
                bubbleBtn.classList.remove('chat-is-open');
                if (bubbleBtn) bubbleBtn.classList.remove('active-tab');
                if (lyricBtn) lyricBtn.classList.remove('active-tab');
            }
        }"""
        
js_chat_new2 = """            } else {
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
            }
        }"""

if js_chat_old2 in content:
    content = content.replace(js_chat_old2, js_chat_new2)
else:
    print("Warning: JS chat bubble close part not found")

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'w') as f:
    f.write(content)
print("Done")
