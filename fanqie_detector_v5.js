/**
 * Quantumult X 直播源抓取脚本 (v5.0 - 电报远程增强版)
 * 功能：拦截直播源并同时通过 本地局域网 和 Telegram Bot 发送
 * 适用：WiFi/移动网络/流量 全场景通用
 */

const pc_ip = "192.168.6.101"; 
const TG_BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const TG_CHAT_ID = "1277218326";

let url = $request.url;

// ===== 拦截逻辑 =====
if (typeof $response === "undefined") {
    // 1. 拦截华为云日志上报 (script-request-body)
    if (url.includes("hwcloudlive.com") && url.includes("log_report")) {
        let body = $request.body;
        let foundUrls = [];
        if (body) {
            try {
                let logData = JSON.parse(body);
                if (logData && logData.logs) {
                    logData.logs.forEach(function (log) {
                        if (log.domain && log.streamName && log.streamName.includes("txSecret")) {
                            foundUrls.push("rtmp://" + log.domain + "/live/" + log.streamName);
                        }
                    });
                }
            } catch (e) {}
        }
        if (foundUrls.length > 0) processResult(foundUrls.join('\n'));
        $done({});
    } 
    // 2. 拦截拉流请求 (script-request-header)
    else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://");
        if (url.includes("sourcelandchina.com")) {
            extracted = extracted.replace(/livefpad/g, "live");
        }
        processResult(extracted);
        $done({});
    }
    else {
        $done({});
    }
} else {
    $done({});
}

// ===== 处理结果：双路发送 =====
function processResult(msg) {
    // 路径 A: 本地局域网 (WiFi 环境高效直连)
    uploadToLocal(msg);
    
    // 路径 B: Telegram Bot (移动/流量环境远程同步)
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
        console.log("ℹ️ [Local] 局域网不可达 (可能是流量模式)");
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
