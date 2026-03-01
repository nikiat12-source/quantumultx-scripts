/**
 * Quantumult X 直播源自动抓取脚本 (V5 字段修正终极版)
 *
 * 思路：拦截 App 向华为云实时上报的播放日志，提取明文 domain + streamName 拼成 webrtc:// 链接
 * 该日志在进入直播间约1秒内即发出，链接完全新鲜有效！
 */

let url = $request.url;

// ===== 拦截华为云日志上报 (script-request-body) =====
if (typeof $response === "undefined") {

    // 拦截 hwcloudlive 日志上报
    if (url.includes("hwcloudlive.com") && url.includes("log_report")) {
        let body = $request.body;
        let foundUrls = [];

        if (body) {
            try {
                let logData = JSON.parse(body);
                if (logData && logData.logs) {
                    logData.logs.forEach(function (log) {
                        // 关键字段：domain 和 streamName
                        // 只处理 startPlay 事件 (event 201) 或者包含 txSecret 的 streamName
                        let domain = log.domain;
                        let streamName = log.streamName;

                        if (domain && streamName && streamName.includes("txSecret")) {
                            // 拼出完整的 webrtc 链接
                            let webrtcUrl = "webrtc://" + domain + "/live/" + streamName;
                            foundUrls.push(webrtcUrl);
                        }
                    });
                }
            } catch (e) {
                // JSON 解析失败，用正则兜底
                let urlMatches = body.match(/(webrtc|rtmp):\/\/[^\s"'<>\\]+/g);
                if (urlMatches) {
                    foundUrls.push(...urlMatches);
                }
            }
        }

        if (foundUrls.length > 0) {
            let uniqueUrls = [...new Set(foundUrls)];
            let msg = uniqueUrls.join('\n\n');
            $notify("🎯 番茄直播源获取成功", "共捕获 " + uniqueUrls.length + " 个", msg, { "clipboard": uniqueUrls[0] });
        }

        $done({}); // 放行，不影响 App 正常上报
    }
    // 拦截拉流请求 (script-request-header)
    else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "webrtc://");
        if (url.includes("sourcelandchina.com")) {
            extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
        }
        $notify("📡 直接抓取推流地址", "domain: " + url.split('/')[2], extracted, { "clipboard": extracted });
        $done({});
    }
    else {
        $done({});
    }
}
// ===== 拦截 API 响应 (script-response-body) - 调试用 =====
else {
    $done({});
}
