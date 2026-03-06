/**
 * Quantumult X 直播源抓取脚本 - 终极诊断版 (v7.0)
 * 功能：WiFi 下直连，5G 下远程，具备实时弹窗反馈。
 * 💡 v7.0 升级：增加异步保护锁与强制通知，彻底解决“没动静”的问题。
 */

// ===== 用户配置区 =====
const TG_BOT_TOKEN = "8422879327:AAGj7ZGUfC8vp_ZTrmMFYFo_GeRt0-KW698"; 
const TG_CHAT_ID = "-5295741692"; 
const PC_IP = "192.168.6.101"; 
const PC_PORT = "8239";
// =====================

let url = $request.url;
let isMatch = false;
let foundMsg = "";

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
        if (foundUrls.length > 0) {
            isMatch = true;
            foundMsg = foundUrls.join('\n');
        }
    } else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://");
        if (url.includes("sourcelandchina.com")) {
            extracted = extracted.replace(/livefpad/g, "live");
        }
        isMatch = true;
        foundMsg = extracted;
    }

    if (isMatch) {
        // 🚀 [诊断核心] 给老板一个最直接的反馈：手机震动+弹窗！
        $notify("🛰️ [抓取基站] 发现目标！", "正在同步至电脑...", foundMsg);
        processDiscovery(foundMsg);
    } else {
        $done({});
    }
} catch (e) {
    $notify("❌ [脚本错误]", "执行异常", e.message);
    $done({});
}

function processDiscovery(msg) {
    let localRequest = {
        url: `http://${PC_IP}:${PC_PORT}/submit`,
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: msg,
        timeout: 5
    };
    
    // 强制执行异步保护，确保 $done 在请求结束后再被调用
    $task.fetch(localRequest).then(
        resp => {
            console.log("✅ [Local] 局域网同步成功");
            $done({});
        },
        err => {
            console.log("📡 [Remote] 局域网不通，切换 5G 中继...");
            notifyTG(msg);
        }
    );
}

function notifyTG(msg) {
    let tgRequest = {
        url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TG_CHAT_ID,
            text: `🛰️ [5G远程抓取] 发现新流:\n${msg}`
        })
    };
    $task.fetch(tgRequest).then(
        resp => {
            console.log("✅ [TG] 远程推送成功");
            $done({});
        },
        reason => {
            console.log("❌ [TG] 推送失败");
            $done({});
        }
    );
}
