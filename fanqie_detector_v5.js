/**
 * Quantumult X 直播源抓取脚本 (v5.5 - 终极稳定性增强版)
 * 功能：拦截直播源，针对华为云日志全面解析，增强 ID 提取鲁棒性，精确去重
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 核心逻辑 =====
if (typeof $response === "undefined") {
    console.log("🎬 [Detector] 捕获: " + url.substring(0, 60) + "...");
    
    // 1. 处理 hwcloudlive 日志 (POST Body)
    if (url.includes("hwcloudlive.com")) {
        let body = $request.body;
        if (body) {
            try {
                let logData = JSON.parse(body);
                if (logData && logData.logs) {
                    logData.logs.forEach(function (log) {
                        // 尝试提取 domain 和 streamName
                        let domain = log.domain || "";
                        let streamName = log.streamName || "";
                        if (domain && streamName) {
                            let fullUrl = "rtmp://" + domain + "/live/" + streamName;
                            processWithDedupe(fullUrl, "HW-LOG");
                        }
                    });
                }
            } catch (e) {
                console.log("❌ [Detector] JSON 解析失败: " + e);
            }
        } else {
            console.log("⚠️ [Detector] HW 请求无 Body，跳过");
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

// ===== 去重与发送核心 =====

function processWithDedupe(streamUrl, sourceTag) {
    let sessionKey = generateSessionKey(streamUrl);
    
    if (sessionKey) {
        let lastSessionKey = $prefs.valueForKey("last_sent_session_key");
        console.log(`🆔 [Detector] (${sourceTag}) SessionKey: ${sessionKey} (之前: ${lastSessionKey})`);

        if (lastSessionKey !== sessionKey) {
            console.log("🚀 [Detector] 发现新有效期，执行双路推送...");
            $prefs.setValueForKey(sessionKey, "last_sent_session_key");
            
            uploadToLocal(streamUrl);
            uploadToTG(streamUrl);
        } else {
            console.log("💤 [Detector] 相同有效期链接，已通过去重器");
        }
    } else {
        console.log("⚠️ [Detector] 无法从源生成 SessionKey: " + streamUrl.substring(0, 50));
    }
}

/**
 * 智能生成会话 Key
 * 规则：提取流 ID 的后 8 位 (作为房间特征) + txTime (作为有效期特征)
 */
function generateSessionKey(sUrl) {
    // 1. 寻找流 ID (通常在 /live/ 后面或者 streamName= 后面)
    let idMatch = sUrl.match(/\/live\/([^\s?/_&]+)/) || sUrl.match(/streamName=([^\s?/_&]+)/);
    // 2. 寻找时间戳
    let timeMatch = sUrl.match(/txTime=([A-Fa-f0-9]+)/);
    
    if (idMatch) {
        let fullId = idMatch[1];
        // 取 ID 最后 8 位，防止链接前缀变化导致判定失效
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
            text: `🛰️ [智能捕获] 发现新流:\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(resp => {
        console.log("✅ [TG] 发送成功");
    }, err => {
        console.log("❌ [TG] 发送失败");
    });
}
