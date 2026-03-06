/**
 * Quantumult X 直播源抓取脚本 - 电报远程版 (fanqie_detector_tg.js)
 * 功能：拦截直播源并直接通过 Telegram Bot 发送，支持全网移动/流量模式
 */

const TG_BOT_TOKEN = "8422879327:AAGj7ZGUfC8vp_ZTrmMFYFo_GeRt0-KW698";
const TG_CHAT_ID = "请通过 TG 发送任意消息给机器人并在 pc 端查看 ID"; // 脚本会自动尝试从持久化存储获取

let url = $request.url;

// ===== 拦截逻辑 =====
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
    if (foundUrls.length > 0) notifyTG(foundUrls.join('\n'));
} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
    let extracted = url.replace(/^https?:\/\//, "rtmp://");
    if (url.includes("sourcelandchina.com")) {
        extracted = extracted.replace(/livefpad/g, "live");
    }
    notifyTG(extracted);
}

$done({});

function notifyTG(msg) {
    // 尝试获取保存的 Chat ID
    let savedChatID = $prefs.valueForKey("tg_chat_id");
    let chatId = savedChatID || TG_CHAT_ID;

    if (!chatId || chatId.includes("请通过")) {
        console.log("❌ [Detector] 缺少 Chat ID，请先向机器人发送消息并在 PC 端同步 ID");
        return;
    }

    let tgRequest = {
        url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: `🛰️ [远程捕获] 发现新直播源:\n${msg}`
        })
    };

    $task.fetch(tgRequest).then(response => {
        console.log("✅ [Detector] 电报推送成功");
    }, reason => {
        console.log("❌ [Detector] 电报推送失败: " + (reason.error || "网络波动"));
    });
}
