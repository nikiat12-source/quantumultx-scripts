/**
 * Quantumult X 直播源抓取脚本 (v5.2 - 时效自适应版)
 * 功能：拦截直播源，基于 房间ID + 时间戳 去重，确保获取最新有效期
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    // 提取关键特征：房间 ID + 时间戳 (txTime)
    // 只有当两者组合不同时，才视为新源，解决老板“进出直播间刷新有效期”的需求
    let sessionKey = extractSessionKey(url);
    
    if (sessionKey) {
        let lastSessionKey = $prefs.valueForKey("last_sent_session_key");
        
        if (lastSessionKey !== sessionKey) {
            // 保存当前特征值
            $prefs.setValueForKey(sessionKey, "last_sent_session_key");
            
            // 转换为拉流格式
            let extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
            processResult(extracted);
        }
    }
    $done({});
} else {
    $done({});
}

// ===== 辅助函数 =====

/**
 * 提取会话特征值
 * 格式：房间名_时间戳 (例如 s1319367283_69a9eeae)
 */
function extractSessionKey(url) {
    let idMatch = url.match(/\/live\/([^\s?/_]+)/);
    let timeMatch = url.match(/txTime=([a-zA-Z0-9]+)/);
    
    if (idMatch) {
        let id = idMatch[1];
        let time = timeMatch ? timeMatch[1] : "notime";
        return `${id}_${time}`;
    }
    return null;
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
            text: `🛰️ [远程捕获] 发现新流 (有效期更新):\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(resp => {
        console.log("✅ [TG] 推送成功");
    }, err => {
        console.log("❌ [TG] 推送失败");
    });
}
