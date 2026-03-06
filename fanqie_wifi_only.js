/**
 * Quantumult X 直播源抓取脚本 - 纯 WiFi 极简版 (fanqie_wifi_only.js)
 * 功能：仅通过局域网直连 PC，零依赖 TG 机器人，极速轻量！
 * 使用条件：手机与 PC 在同一 WiFi 下即可
 */

// ===== 配置区 =====
const PC_IP = "192.168.6.101";
const PC_PORT = "8239";
// =================

let url = $request.url;

try {
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
            } catch (e) { console.log("JSON解析失败: " + e); }
        }
        if (foundUrls.length > 0) sendToPC(foundUrls.join('\n'));
        else $done({});

    } else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://");
        if (url.includes("sourcelandchina.com")) {
            extracted = extracted.replace(/livefpad/g, "live");
        }
        sendToPC(extracted);
    } else {
        $done({});
    }
} catch (e) {
    console.log("❌ 脚本异常: " + e);
    $done({});
}

function sendToPC(msg) {
    $task.fetch({
        url: `http://${PC_IP}:${PC_PORT}/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg
    }).then(
        resp => { console.log("✅ [WiFi] 链接已发送至 PC"); $done({}); },
        err  => { console.log("❌ [WiFi] 局域网不通，请检查 PC 是否在线"); $done({}); }
    );
}
