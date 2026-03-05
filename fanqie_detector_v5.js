/**
 * Quantumult X 直播源抓取脚本 (v5.3 - 深度调试版)
 * 功能：拦截直播源，基于 房间ID + 时间戳 去重，带详细日志输出
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    console.log("🎬 [Detector] 捕获到请求: " + url.substring(0, 50) + "...");
    
    // 提前识别域名
    if (url.includes("szier2.com") || url.includes("sourcelandchina.com") || url.includes("hwcloudlive.com")) {
        let sessionKey = extractSessionKey(url);
        console.log("🆔 [Detector] 提取 SessionKey: " + sessionKey);
        
        if (sessionKey) {
            let lastSessionKey = $prefs.valueForKey("last_sent_session_key");
            console.log("📂 [Detector] 历史 Key: " + lastSessionKey);
            
            if (lastSessionKey !== sessionKey) {
                console.log("🚀 [Detector] 检测到新源或新有效期，准备发送...");
                $prefs.setValueForKey(sessionKey, "last_sent_session_key");
                
                let extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
                processResult(extracted);
            } else {
                console.log("💤 [Detector] 链接未变化，已忽略重复发送");
            }
        } else {
            console.log("⚠️ [Detector] 无法从 URL 提取特征值");
        }
    }
    $done({});
} else {
    $done({});
}

// ===== 辅助函数 =====

function extractSessionKey(url) {
    // 兼容不同平台的 ID 提取
    let idMatch = url.match(/\/live\/([^\s?/_]+)/) || url.match(/streamName=([^&]+)/);
    let timeMatch = url.match(/txTime=([a-zA-Z0-9]+)/);
    
    if (idMatch) {
        let id = idMatch[1];
        let time = timeMatch ? timeMatch[1] : "default";
        return `${id}_${time}`;
    }
    return null;
}

function processResult(msg) {
    uploadToLocal(msg);
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
            text: `🛰️ [在线捕获] 发现新流:\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(resp => {
        console.log("✅ [TG] 推送成功");
    }, err => {
        console.log("❌ [TG] 推送失败: " + JSON.stringify(err));
    });
}
