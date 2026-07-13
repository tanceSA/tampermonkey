// ==UserScript==
// @name         HTML5 網頁純淨全螢幕 (含選單保留版)
// @namespace    http://tampermonkey.net
// @version      3.2
// @description  按下 Alt+P 讓播放器容器鋪滿視窗，保留原網站控制選單。可從選單動態加入或排除。
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**********************************************************************
     * 啟動選單管理（改由 window.CustomMIS 呼叫）
     **********************************************************************/
    if (window.CustomMIS && typeof window.CustomMIS.setupMenuManager === 'function') {
        window.CustomMIS.setupMenuManager("allowedSites", "關鍵字移除器", runMainScript);
    } else {
        // 防禦性降級：萬一 CDN 爆了或 Lib 載入失敗，依然保證預設執行主程式
        console.error("找不到外部管理庫 CustomMIS，將預設直接執行主程式。");
        runMainScript();
    }

    /**********************************************************************
     * 主程式邏輯
     **********************************************************************/

    function runMainScript() {
        const currentHost = window.location.hostname; // 補上這行，防禦噴錯
        console.log(`[全螢幕腳本] 功能已在 ${currentHost} 啟動！`);

        GM_addStyle(`
            .pure-container-fullscreen {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 2147483647 !important;
                background: #000 !important;
            }
            .pure-container-fullscreen video {
                width: 100% !important;
                height: 100% !important;
            }
            .pure-video-no-scroll {
                overflow: hidden !important;
            }
        `);

        let isFullscreen = false;
        let targetContainer = null;
        let activeVideo = null;

        // --- 核心改進：遍歷所有節點找 video（含 Shadow DOM） ---
        function findAllVideos(root = document) {
            const videos = [];
            try {
                root.querySelectorAll('video').forEach(v => videos.push(v));
                // 搜尋 shadow roots
                const allElements = root.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.shadowRoot) {
                        videos.push(...findAllVideos(el.shadowRoot));
                    }
                }
            } catch (e) {
                // 某些網站 CORS 阻擋 iframe access 時忽略
            }
            return videos;
        }

        // --- 核心改進：遍歷所有 iframe 找 video ---
        function findVideosInIframes() {
            const videos = [];
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (doc) {
                        videos.push(...findAllVideos(doc));
                    }
                } catch (e) {
                    // 跨域 iframe 會被拒絕，正常忽略
                }
            }
            return videos;
        }

        function getAllVideos() {
            return [...findAllVideos(), ...findVideosInIframes()];
        }

        function findVideoContainer(video) {
            if (!video) return null;
            let current = video;
            for (let i = 0; i < 6; i++) {
                if (current.parentElement && current.parentElement !== document.body) {
                    current = current.parentElement;
                    const cls = (typeof current.className === 'string') ? current.className.toLowerCase() : '';
                    if (cls.includes('player') || cls.includes('video-wrap') || cls.includes('container')) {
                        return current;
                    }
                }
            }
            return video.parentElement || video;
        }

        function enterFullscreen(video) {
            activeVideo = video;
            targetContainer = findVideoContainer(video);
            if (!targetContainer) return;

            targetContainer.classList.add('pure-container-fullscreen');
            document.body.classList.add('pure-video-no-scroll');

            let parent = targetContainer.parentElement;
            while (parent && parent !== document.body) {
                parent.style.setProperty('overflow', 'visible', 'important');
                parent.style.setProperty('z-index', '2147483646', 'important');
                parent = parent.parentElement;
            }

            isFullscreen = true;
            console.log('[全螢幕腳本] 已進入純淨全螢幕模式 (保留選單)');
        }

        function exitFullscreen() {
            if (!targetContainer) return;

            targetContainer.classList.remove('pure-container-fullscreen');
            document.body.classList.remove('pure-video-no-scroll');

            let parent = targetContainer.parentElement;
            while (parent && parent !== document.body) {
                parent.style.removeProperty('overflow');
                parent.style.removeProperty('z-index');
                parent = parent.parentElement;
            }

            isFullscreen = false;
            console.log('[全螢幕腳本] 已退出純淨全螢幕模式');
        }

        function togglePureFullscreen(video) {
            if (!video) {
                const videos = getAllVideos();
                if (videos.length === 0) {
                    console.log('[全螢幕腳本] 此網頁未偵測到 HTML5 影片播放器！');
                    return;
                }
                video = videos[0];
            }

            if (isFullscreen) {
                exitFullscreen();
            } else {
                enterFullscreen(video);
            }
        }

        // --- 改進：點擊 video 時進入全螢幕 ---
        function bindVideoClick(video) {
            if (video._pureFullscreenBound) return;
            video._pureFullscreenBound = true;

            video.addEventListener('click', function(e) {
                // 若已全螢幕則不處理，讓網站自行處理
                if (isFullscreen) return;
                // 延遲判斷，避免與網站原有點擊事件衝突
                setTimeout(() => {
                    if (!isFullscreen) {
                        enterFullscreen(video);
                    }
                }, 100);
            });
        }

        // --- 改進：監聽新載入的影片 ---
        function scanAndBind() {
            const videos = getAllVideos();
            videos.forEach(bindVideoClick);
        }

        const observer = new MutationObserver(scanAndBind);
        observer.observe(document.body, { childList: true, subtree: true });
        scanAndBind();

        // 鍵盤快速鍵：Alt+P 切換，ESC 退出
        window.addEventListener('keydown', function(e) {
            if (e.altKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                togglePureFullscreen();
            }
            if (e.key === 'Escape' && isFullscreen) {
                e.preventDefault();
                exitFullscreen();
            }
        });
    }
})();
