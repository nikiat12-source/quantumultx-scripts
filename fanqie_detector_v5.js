/**
 * Quantumult X 直播源抓取脚本 (v5.4 - 华为云深度优化版)
 * 功能：拦截直播源，针对华为云日志上报进行特殊解析，并实现基于有效期的时间戳去重
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    // 1. 针对 hwcloudlive 日志上报的特殊处理 (通常是 POST body)
    if (url.includes("hwcloudlive.com") && url.includes("log_report")) {
        let body = $request.body;
        if (body) {
            try {
                let logData = JSON.parse(body);
                if (logData && logData.logs) {
                    logData.logs.forEach(function (log) {
                        // 寻找包含直播流信息的日志
                        if (log.domain && log.streamName) {
                            let fullUrl = "rtmp://" + log.domain + "/live/" + log.streamName;
                            processWithDedupe(fullUrl);
                        }
                    });
                }
            } catch (e) {
                console.log("❌ [Detector] 解析华为云 Body 失败: " + e);
            }
        }
    } 
    // 2. 针对常规拉流请求的拦截 (szier2 / sourcelandchina)
    else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
        processWithDedupe(extracted);
    }
    
    $done({});
} else {
    $done({});
}

// ===== 去重 & 发送模块 =====

function processWithDedupe(streamUrl) {
    let sessionKey = extractKeyFromStream(streamUrl);
    console.log("🆔 [Detector] 检查特征口令: " + sessionKey);

    if (sessionKey) {
        let lastSessionKey = $prefs.valueForKey("last_sent_session_key");
        
        if (lastSessionKey !== sessionKey) {
            console.log("🚀 [Detector] 捕获到新信号，发送中...");
            $prefs.setValueForKey(sessionKey, "last_sent_session_key");
            
            // 执行双路发送
            uploadToLocal(streamUrl);
            uploadToTG(streamUrl);
        } else {
            console.log("💤 [Detector] 有效期内重复信号，已过滤");
        }
    }
}

/**
 * 从最终生成的直播流 URL 中提取特征
 * 格式：流ID_时间戳
 */
function extractKeyFromStream(sUrl) {
    let idMatch = sUrl.match(/\/live\/([^\s?/_]+)/);
    let timeMatch = sUrl.match(/txTime=([a-zA-Z0-9]+)/);
    
    if (idMatch) {
        let id = idMatch[1];
        let time = timeMatch ? timeMatch[1] : "fixed";
        return `${id}_${time}`;
    }
    return null;
}

// ===== 通信函数 =====

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
        console.log("✅ [TG] 发送成功");
    }, err => {
        console.log("❌ [TG] 发送失败");
    });
}
