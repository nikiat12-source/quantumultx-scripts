/**
 * Quantumult X 直播源抓取脚本 (v5.6 - 静默增强版)
 * 功能：拦截直播源，实现“一房间一发”，支持电报静默推送（不弹窗提示）
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    // 1. 处理 hwcloudlive 日志 (POST Body)
    if (url.includes("hwcloudlive.com")) {
        let body = $request.body;
        if (body) {
            try {
                let logData = JSON.parse(body);
                if (logData && logData.logs) {
                    logData.logs.forEach(function (log) {
                        let domain = log.domain || "";
                        let streamName = log.streamName || "";
                        if (domain && streamName) {
                            let fullUrl = "rtmp://" + domain + "/live/" + streamName;
                            processWithDedupe(fullUrl, "HW-LOG");
                        }
                    });
                }
            } catch (e) {}
        }
    } 
    // 2. 处理常规拉流链接 (GET)
    else if (url.includes("szier2.com") || url.includes("sourcelandchina.com")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
        processWithDedupe(extracted, "DIRECT");
    }
    
    $done({});
} else {
    $done({});
}

// ===== 去重与发送模块 =====

function processWithDedupe(streamUrl, sourceTag) {
    let sessionKey = generateSessionKey(streamUrl);
    
    if (sessionKey) {
        let lastSessionKey = $prefs.valueForKey("last_sent_session_key");

        if (lastSessionKey !== sessionKey) {
            $prefs.setValueForKey(sessionKey, "last_sent_session_key");
            
            // 执行双路推送
            uploadToLocal(streamUrl);
            uploadToTG(streamUrl); // 开启静默模式
        }
    }
}

function generateSessionKey(sUrl) {
    let idMatch = sUrl.match(/\/live\/([^\s?/_&]+)/) || sUrl.match(/streamName=([^\s?/_&]+)/);
    let timeMatch = sUrl.match(/txTime=([A-Fa-f0-9]+)/);
    
    if (idMatch) {
        let fullId = idMatch[1];
        let shortId = fullId.length > 8 ? fullId.slice(-8) : fullId;
        let time = timeMatch ? timeMatch[1] : "notime";
        return `${shortId}_${time}`;
    }
    return null;
}

// ===== 通信逻辑 =====

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
            text: `🛰️ [自动抓取] 发现新流:\n${msg}`,
            disable_notification: true // ✨ 核心：开启静默发送，手机不会震动/弹窗
        })
    };
    $task.fetch(tgRequest).then(resp => {
        console.log("✅ [TG] 静默推送成功");
    }, err => {
        console.log("❌ [TG] 发送失败");
    });
}
