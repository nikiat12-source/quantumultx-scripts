/**
 * Quantumult X 直播源抓取脚本 (V5 极致安全防掉线版)
 *
 * 【核心升级】：
 * 1. 绝对的“旁路嗅探”：只闻不问，绝不篡改任何 App 与服务器之间的通信数据。
 * 2. 修复了旧版中因为 $done({}) 导致上报日志变空（被吞），从而可能导致 App 验证报错踢下线的问题。
 * 3. 提取到 webrtc 链接后，仅在【系统通知】和【剪贴板】里将其转换为 rtmp 方便你电脑播放，但丝毫不影响原 App 使用 webrtc 去拉流。
 */

const url = $request.url;

try {
    // 1. 拦截拉流请求 (script-request-header)
    if (typeof $response === "undefined" && !url.includes("log_report")) {
        let extracted = "";
        if (url.includes("sourcelandchina.com/live")) {
            extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
        } else if (url.includes("szier2.com/live")) {
            extracted = url.replace(/^https?:\/\//, "webrtc://");
        }

        if (extracted !== "") {
            // 在剪贴板里为你换成 rtmp 方便直接去电脑或外部播放器看
            let copyUrl = extracted.replace("webrtc://", "rtmp://");
            $notify("📡 直接截获 (极速安全版)", "点击复制 RTMP 链接", copyUrl, { "clipboard": copyUrl });
        }
    }
    // 2. 拦截 App 的日志上报请求 (script-request-body)
    else if (typeof $response === "undefined" && url.includes("log_report") && $request.body) {
        let body = $request.body;
        let foundUrls = [];

        try {
            // 尝试按 JSON 解析
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
                        } catch (e) {}
                    }
                });
            }
        } catch (e) {
            // 兜底：直接全文无脑正则提取
            let cleanBody = body.replace(/\\\//g, '/');
            let match = cleanBody.match(/(webrtc|rtmp):\/\/[^\s'"<>\\]+/g);
            if (match) {
                foundUrls.push(...match);
            }
        }

        if (foundUrls.length > 0) {
            let uniqueUrls = [...new Set(foundUrls)];
            let originalUrl = uniqueUrls[0];
            let rtmpUrl = originalUrl.replace("webrtc://", "rtmp://");
            $notify("🎯 日志嗅探 (极速安全版)", `成功捕获！点击复制 RTMP 去播放`, rtmpUrl, { "clipboard": rtmpUrl });
        }
    }
} catch (error) {
    console.log("脚本执行出现小错误: " + error);
}

// 【最关键的一步防掉线】：
// 不传任何空对象，直接调用无参的 $done()，表示对请求“原封不动得放行”
// 原有 App 依然会用原生态的状态跟服务器沟通，毫无察觉被我们偷窥了
$done();
