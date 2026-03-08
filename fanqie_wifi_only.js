/**
 * Quantumult X 直播源抓取脚本 - 纯 WiFi 极简版 (fanqie_wifi_only.js)
 * 功能：仅通过局域网直连 PC，零依赖 TG 机器人！
 * 💡 v2：Fire-and-forget 模式，$done 永不阻塞请求！
 */

// ===== 配置区 =====
const PC_IP = "192.168.6.101";
const PC_PORT = "8309";
// =================

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
        } catch (e) {}
    }
    if (foundUrls.length > 0) sendToPC(foundUrls.join('\n'));

} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
    let extracted = url.replace(/^https?:\/\//, "rtmp://");
    if (url.includes("sourcelandchina.com")) {
        extracted = extracted.replace(/livefpad/g, "live");
    }
    sendToPC(extracted);
}

// ✅ 立刻释放，不阻塞原始请求！fetch 在后台继续执行
$done({});

function sendToPC(msg) {
    $task.fetch({
        url: `http://${PC_IP}:${PC_PORT}/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg
    }).then(
        resp => console.log("✅ [WiFi] 链接已发送至 PC"),
        err  => console.log("❌ [WiFi] 局域网不通")
    );
}
