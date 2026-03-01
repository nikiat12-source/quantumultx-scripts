/**
 * Quantumult X 直播源抓取脚本 (V4 日志反向提取版)
 *
 * 突破 AES 加密的新思路：拦截 App 向华为云上报的播放日志，从中提取明文直播源！
 */

let url = $request.url;

// 1. 拦截拉流请求 (script-request-header)
if (typeof $response === "undefined" && !url.includes("log_report")) {
    let extracted = "";
    if (url.includes("sourcelandchina.com/live")) {
        extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
    } else if (url.includes("szier2.com/live")) {
        extracted = url.replace(/^https?:\/\//, "webrtc://");
    }

    if (extracted !== "") {
        $notify("📡 番茄推流直接截获", "抓取成功", extracted, { "clipboard": extracted });
    }
    $done({});
}
// 2. 拦截 App 的日志上报请求 (script-request-body)
else if (typeof $response === "undefined" && url.includes("log_report")) {
    let body = $request.body;
    let foundUrls = [];

    if (body) {
        try {
            // 解析上报的 JSON
            let logData = JSON.parse(body);
            if (logData && logData.logs) {
                logData.logs.forEach(logEntry => {
                    if (logEntry.params) {
                        try {
                            let paramsObj = JSON.parse(logEntry.params);
                            if (paramsObj.streamUrl) {
                                let streamUrl = paramsObj.streamUrl.replace(/\\\//g, '/');
                                foundUrls.push(streamUrl);
                            }
                        } catch (e) {
                            // 忽略单个 params 解析错误
                        }
                    }
                });
            }
        } catch (e) {
            // fallback: 如果 JSON 解析失败，使用正则暴力兜底提取
            let cleanBody = body.replace(/\\\//g, '/');
            let match = cleanBody.match(/(webrtc|rtmp):\/\/[^\s'"<>\\]+/g);
            if (match) {
                foundUrls.push(...match);
            }
        }
    }

    if (foundUrls.length > 0) {
        let uniqueUrls = [...new Set(foundUrls)];
        let message = uniqueUrls.join('\n\n');
        $notify("🎯 极客破解：日志反向提取", `成功捕获明文直播源`, message, { "clipboard": uniqueUrls[0] });
    }

    $done({}); // 放行日志请求
}
// 3. 拦截 API 响应 (script-response-body) - 兜底或调试
else {
    let body = $response.body;

    if (url.includes("OpenAPI") && url.includes("live") && !url.includes("hwcloudlive.com")) {
        $notify("🧪 API监控运行中", "已拦截加密流", "等待日志上报解密...");
    }

    $done({});
}
