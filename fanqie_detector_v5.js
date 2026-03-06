/**
 * Quantumult X 直播源抓取脚本 - 双模驱动版 (fanqie_detector_v5.js)
 * 功能：WiFi 下直连电脑 IP，5G 下通过 Telegram 远程同步。
 * 💡 v6.3 升级：解决移动网络下无法抓取的问题。
 */

// ===== 用户配置区 =====
const TG_BOT_TOKEN = "8422879327:AAGj7ZGUfC8vp_ZTrmMFYFo_GeRt0-KW698"; // fasong857bot
const PC_IP = "192.168.6.101"; // 老板的电脑内网 IP
const PC_PORT = "8239";
// =====================

let url = $request.url;

// 1. 拦截华为云日志 (POST)
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
        } catch (e) { }
    }
    if (foundUrls.length > 0) processDiscovery(foundUrls.join('\n'));
} 
// 2. 拦截协议头 (GET)
else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
    let extracted = url.replace(/^https?:\/\//, "rtmp://");
    if (url.includes("sourcelandchina.com")) {
        extracted = extracted.replace(/livefpad/g, "live");
    }
    processDiscovery(extracted);
}

$done({});

/**
 * 核心：智能分流处理。优先局域网，失败则走电报。
 */
function processDiscovery(msg) {
    // 1. 尝试本地局域网同步 (最快)
    let localRequest = {
        url: `http://${PC_IP}:${PC_PORT}/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg,
        timeout: 2 // 快速超时，防止阻塞
    };

    $task.fetch(localRequest).then(
        resp => console.log("✅ [Local] 局域网同步成功"),
        err => {
            console.log("📡 [Network] 局域网无法连接，正在启动 TG 远程救援...");
            notifyTG(msg);
        }
    );
}

function notifyTG(msg) {
    let savedChatID = $prefs.valueForKey("tg_chat_id");
    // 如果没有 savedChatID，由于脚本无法知道该发给谁，会在此卡住。
    // 💡 建议：老板请手动将 PC 运行时的 Chat ID 填入下方的默认值中。
    let chatId = savedChatID || ""; 

    if (!chatId) {
        console.log("⚠️ [Detector] 缺少 Chat ID。移动网络下必须先向机器人发送任意消息以激活！");
        return;
    }

    let tgRequest = {
        url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: `🛰️ [5G捕获] 发现新流:\n${msg}`
        })
    };

    $task.fetch(tgRequest).then(
        resp => console.log("✅ [TG] 远程推送成功"),
        reason => console.log("❌ [TG] 推送失败，请检查网络")
    );
}
