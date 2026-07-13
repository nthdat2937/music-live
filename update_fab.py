import re

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'r') as f:
    content = f.read()

# Replace HTML
html_old = """        <button id="lyric-bubble-btn" class="chat-bubble-btn" onclick="toggleLyricBubble()" style="bottom: 152px; background: rgba(77, 171, 247, 0.7);">
            <span class="material-symbols-outlined" style="font-size:28px;">lyrics</span>
        </button>
        <button id="chat-bubble-btn" class="chat-bubble-btn" onclick="toggleChatBubble()">
            <span class="bubble-icon-chat" style="display:flex;align-items:center;justify-content:center;"><span
                    class="material-symbols-outlined" style="font-size:28px;">chat</span></span>
            <span id="chat-badge" class="chat-badge hidden-badge">0</span>
        </button>"""

html_new = """        <div class="fab-menu-container" id="mobile-fab-menu">
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

if html_old in content:
    content = content.replace(html_old, html_new)
else:
    print("Warning: HTML part not found, attempting regex...")
    content = re.sub(r'<button id="lyric-bubble-btn".*?</button>\s*<button id="chat-bubble-btn".*?</button>', html_new, content, flags=re.DOTALL)


# Replace Base CSS
css_old_base = """        /* Chat Bubble Button (mobile only) */
        .chat-bubble-btn {
            display: flex;
            position: fixed;
            bottom: 84px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            border: none;
            cursor: pointer;
            z-index: 400;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .chat-bubble-btn:hover {
            transform: scale(1.1);
        }

        .chat-bubble-btn:active {
            transform: scale(0.92);
        }

        .chat-bubble-btn.chat-is-open {
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .chat-bubble-btn.chat-is-open .bubble-icon-chat {
            display: none;
        }

        .chat-bubble-btn.chat-is-open .bubble-icon-close {
            display: block;
        }

        .chat-bubble-btn .bubble-icon-close {
            display: none;
        }

        @media(min-width: 900px) {
            .chat-bubble-btn {
                display: none !important;
            }
        }"""

css_new_base = """        /* Mobile FAB Menu */
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
        }

        @media(min-width: 900px) {
            .fab-menu-container {
                display: none !important;
            }
        }"""

if css_old_base in content:
    content = content.replace(css_old_base, css_new_base)
else:
    print("Warning: CSS Base part not found")

# Replace Premium Mobile CSS
css_old_premium = """            /* --- Floating Action Buttons: Premium Glassmorphism --- */
            .chat-bubble-btn {
                width: 50px;
                height: 50px;
                border-radius: 16px;
                bottom: calc(72px + env(safe-area-inset-bottom, 0px));
                right: 16px;
                background: rgba(77, 171, 247, 0.9);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .chat-bubble-btn .material-symbols-outlined {
                font-size: 24px !important;
            }

            .chat-bubble-btn:active {
                transform: scale(0.88);
            }

            .chat-bubble-btn.chat-is-open {
                background: rgba(40, 40, 50, 0.85);
                backdrop-filter: blur(12px);
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3),
                            inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            #lyric-bubble-btn {
                bottom: calc(130px + env(safe-area-inset-bottom, 0px)) !important;
                background: rgba(77, 171, 247, 0.7) !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }"""

css_new_premium = """            /* --- Floating Action Buttons: Premium Glassmorphism --- */
            .fab-menu-container {
                bottom: calc(72px + env(safe-area-inset-bottom, 0px));
                right: 16px;
            }
            
            .fab-menu-btn .material-symbols-outlined {
                font-size: 24px !important;
            }"""

if css_old_premium in content:
    content = content.replace(css_old_premium, css_new_premium)
else:
    print("Warning: CSS Premium part not found")

# Replace small CSS chunk 3
css_old_small = """            .chat-bubble-btn {
                width: 46px;
                height: 46px;
                border-radius: 14px;
            }"""
css_new_small = """            .fab-menu-container {
                transform: scale(0.9);
                transform-origin: bottom right;
            }"""

if css_old_small in content:
    content = content.replace(css_old_small, css_new_small)

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'w') as f:
    f.write(content)

print("Done")
