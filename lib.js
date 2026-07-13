// === lib.js ===
(function(window) {
    'use strict';

    // 建立命名空間
    window.CustomMIS = window.CustomMIS || {};

    /**
     * 共用名單管理與選單註冊函式
     */
    window.CustomMIS.setupMenuManager = function(storageKey, featureName, runMainCallback) {
        const currentHost = window.location.hostname;
        if (!currentHost) {
            if (typeof runMainCallback === 'function') runMainCallback();
            return;
        }

        // 讀取排除名單，防禦性確保為陣列
        let excludedSites = GM_getValue(storageKey, []);
        if (!Array.isArray(excludedSites)) excludedSites = [];

        const isExcluded = excludedSites.includes(currentHost);

        if (isExcluded) {
            GM_registerMenuCommand(`➕ 恢復此網站的 [${featureName}] 功能`, () => {
                excludedSites = excludedSites.filter(site => site !== currentHost);
                GM_setValue(storageKey, excludedSites);
                alert(`[${featureName}] 已恢復在 ${currentHost} 的運作！`);
                location.reload();
            });
        } else {
            GM_registerMenuCommand(`❌ 在此網站暫停 [${featureName}] 功能`, () => {
                if (!excludedSites.includes(currentHost)) {
                    excludedSites.push(currentHost);
                }
                GM_setValue(storageKey, excludedSites);
                alert(`[${featureName}] 已在 ${currentHost} 暫停！`);
                location.reload();
            });

            if (typeof runMainCallback === 'function') runMainCallback();
        }
    };

})(window);