// === lib.js (白名單制：預設不啟用版) ===
(function(window) {
    'use strict';

    window.CustomMIS = window.CustomMIS || {};

    /**
     * 共用名單管理與選單註冊函式 (預設不啟用 / 白名單邏輯)
     * @param {string} storageKey - Tampermonkey 儲存的鍵名 (例如 "allowedSites")
     * @param {string} featureName - 顯示在選單上的功能名稱 (例如 "關鍵字移除")
     * @param {Function} runMainCallback - 允許執行時要呼叫的主程式
     */
    window.CustomMIS.setupMenuManager = function(storageKey, featureName, runMainCallback) {
        const currentHost = window.location.hostname;
        
        // 防禦性檢查：若拿不到主機名稱則安全退出
        if (!currentHost) return;

        // 防禦性檢查：確保讀取出來的必定是陣列
        let allowedSites = GM_getValue(storageKey, []);
        if (!Array.isArray(allowedSites)) {
            allowedSites = [];
        }

        // 判斷當前網站是否在「允許名單」內
        const isAllowed = allowedSites.includes(currentHost);

        if (isAllowed) {
            // 【已啟用狀態】➔ 顯示「停用」按鈕，並執行主程式
            GM_registerMenuCommand(`❌ 停用此網站${featureName}功能 (${currentHost})`, () => {
                allowedSites = allowedSites.filter(site => site !== currentHost);
                GM_setValue(storageKey, allowedSites);
                alert(`已將 ${currentHost} 移出作用名單！`);
                location.reload();
            });

            // 關鍵安全防禦：確保 callback 是函式才執行
            if (typeof runMainCallback === 'function') {
                runMainCallback();
            }

        } else {
            // 【預設不啟用狀態】➔ 僅顯示「啟用」按鈕，不執行主程式
            GM_registerMenuCommand(`➕ 啟用此網站${featureName}功能 (${currentHost})`, () => {
                if (!allowedSites.includes(currentHost)) {
                    allowedSites.push(currentHost);
                }
                GM_setValue(storageKey, allowedSites);
                alert(`已將 ${currentHost} 加入作用名單！將自動重新整理。`);
                location.reload();
            });
        }
    };

})(window);