// ==UserScript==
// @name         關鍵字移除器 (外部 Lib 乾淨版)
// @namespace    https://tampermonkey.net/
// @version      2.1
// @description  自動移除指定關鍵字（透過外部庫管理選單）
// @author       YourName
// @match        *://*/*
// @run-at       document-end
//
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
//
// @require https://github.com/tanceSA/tampermonkey/raw/refs/heads/main/lib.js
// ==/UserScript==

(function () {
    'use strict';

    const words = ["NordVPN", "Surfshark", "ExpressVPN",
                  "臺灣小説網→𝔱𝔴𝔨𝔞𝔫.𝔠𝔬𝔪"];

    /**********************************************************************
     * 啟動選單管理（改由 window.CustomMIS 呼叫）
     **********************************************************************/
    if (window.CustomMIS && typeof window.CustomMIS.setupMenuManager === 'function') {
        window.CustomMIS.setupMenuManager("keywordRemoverSites", "關鍵字移除器", runMainScript);
    } else {
        // 防禦性降級：萬一 CDN 爆了或 Lib 載入失敗，依然保證預設執行主程式
        console.error("找不到外部管理庫 CustomMIS，將預設直接執行主程式。");
        runMainScript();
    }
    /**********************************************************************
     * 主程式 (核心邏輯保持不變，僅修正防禦性細節)
     **********************************************************************/
    function runMainScript() {

        /**
         * 處理單一文字節點
         */
        function processTextNode(node) {
            if (!node || node.nodeValue === null) return; // 防禦性檢查

            let text = node.nodeValue;
            let changed = false;

            for (const word of words) {
                if (text.includes(word)) {
                    text = text.split(word).join("");
                    changed = true;
                }
            }

            if (changed) {
                node.nodeValue = text;
            }
        }

        /**
         * 遞迴走訪 DOM
         */
        function walk(node) {
            if (!node) return;

            // 文字節點
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node);
                return;
            }

            // 非 Element
            if (node.nodeType !== Node.ELEMENT_NODE)
                return;

            // 忽略不需要掃描的元素
            switch (node.tagName) {
                case "SCRIPT":
                case "STYLE":
                case "NOSCRIPT":
                case "TEXTAREA":
                case "INPUT":
                case "OPTION":
                    return;
            }

            // 掃描子節點
            for (const child of node.childNodes) {
                walk(child);
            }
        }

        /**************************************************************
         * 首次掃描
         **************************************************************/
        if (document.body) {
            walk(document.body);
        }

        /**************************************************************
         * 監控 DOM 變化
         **************************************************************/
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // 文字內容改變
                if (mutation.type === "characterData") {
                    processTextNode(mutation.target);
                    continue;
                }

                // 新增節點
                for (const node of mutation.addedNodes) {
                    walk(node);
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        console.log("[Keyword Remover] 已啟動 (預設全域啟用模式)");
    }

})();