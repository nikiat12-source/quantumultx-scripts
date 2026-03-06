/**
 * Quantumult X 直播源抓取脚本 - 终极无缓存版 (v6.4)
 * 功能：WiFi 下直连电脑 IP，5G 下通过 Telegram 远程同步。
 * 💡 v6.4 升级：重命名以彻底绕过 QuanX 缓存，强制启用新 Token 芯片。
 */

// ===== 用户配置区 =====
const TG_BOT_TOKEN = "8422879327:AAGj7ZGUfC8vp_ZTrmMFYFo_GeRt0-KW698"; // 明确使用 fasong857bot
const PC_IP = "192.168.6.101"; 
const PC_PORT = "8239";
// =====================

let url = $request.url;

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
} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
    let extracted = url.replace(/^https?:\/\//, "rtmp://");
    if (url.includes("sourcelandchina.com")) {
        extracted = extracted.replace(/livefpad/g, "live");
    }
    processDiscovery(extracted);
}

$done({});

function processDiscovery(msg) {
    let localRequest = {
        url: `http://${PC_IP}:${PC_PORT}/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg,
        timeout: 2
    };
    $task.fetch(localRequest).then(
        resp => console.log("✅ [Local] 局域网同步成功"),
        err => notifyTG(msg)
    );
}

function notifyTG(msg) {
    let savedChatID = $prefs.valueForKey("tg_chat_id");
    // 如果没有 savedChatID，由于脚本无法知道该发给谁，会在此卡住。
    // 💡 提示：如果老板能在 QuanX 日志看到 Chat ID，请手动填入这里！
    let chatId = savedChatID || ""; 

    if (!chatId) {
        console.log("❌ [v6.4] 缺少 Chat ID。请先向机器人发送任意消息后再刷新抓取！");
        return;
    }

    let tgRequest = {
        url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: `🛰️ [v6.4 捕获] 发现新流:\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(
        resp => console.log("✅ [TG] 远程推送成功"),
        reason => console.log("❌ [TG] 推送失败")
    );
}
