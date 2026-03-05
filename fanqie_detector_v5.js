/**
 * Quantumult X 直播源抓取脚本 (v5.1 - 去重增强版)
 * 功能：拦截直播源，实现“一房间一发”，支持 WiFi 和 Telegram 远程双发
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    // 1. 过滤 & 提取唯一 ID
    let streamId = extractStreamId(url);
    if (streamId) {
        // 检查是否已经发送过该 ID (去重)
        let lastSentId = $prefs.valueForKey("last_sent_stream_id");
        if (lastSentId !== streamId) {
            // 设置新 ID
            $prefs.setValueForKey(streamId, "last_sent_stream_id");
            
            // 执行发送
            let extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
            processResult(extracted);
        }
    }
    $done({});
} else {
    $done({});
}

// ===== 辅助函数 =====

// 从 URL 中提取直播间唯一标识 (例如 s1319367283)
function extractStreamId(url) {
    let match = url.match(/\/live\/([^\s?/_]+)/);
    return match ? match[1] : null;
}

function processResult(msg) {
    // 路径 A: 本地局域网
    uploadToLocal(msg);
    // 路径 B: Telegram Bot
    uploadToTG(msg);
}

function uploadToLocal(msg) {
    let uploadRequest = {
        url: `http://${pc_ip}:8239/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg
    };
    $task.fetch(uploadRequest).then(resp => {
        console.log("✅ [Local] 上传成功");
    }, err => {
        console.log("ℹ️ [Local] 局域网不可达");
    });
}

function uploadToTG(msg) {
    let tgRequest = {
        url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TG_CHAT_ID,
            text: `🛰️ [远程捕获] 发现新流:\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(resp => {
        console.log("✅ [TG] 推送成功");
    }, err => {
        console.log("❌ [TG] 推送失败");
    });
}
