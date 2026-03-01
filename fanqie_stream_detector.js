/**
 * Quantumult X 直播源抓取与通知脚本 (进阶防干扰版)
 *
 * 1. 针对 HTTP-FLV 拉流请求，直接通过 request-header 提取
 * 2. 针对 API 响应，通过 response-body 提取，且绝对不破坏源数据
 */

let url = $request.url;

// 如果是拉流请求拦截 (script-request-header)
if (typeof $response === "undefined") {
    let extracted = "";

    if (url.includes("sourcelandchina.com/live")) {
        extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
    } else if (url.includes("szier2.com/live")) {
        extracted = url.replace(/^https?:\/\//, "webrtc://");
    }

    if (extracted !== "") {
        let subtitle = `🔥 嗅探到拉流源`;
        $notify("📡 番茄直播直接捕获", subtitle, extracted, { "clipboard": extracted });
        console.log("直接嗅探到拉流链接: " + extracted);
    }

    // 放行请求，不修改任何头信息
    $done({});
}
// 如果是 API 响应拦截 (script-response-body)
else {
    let body = $response.body;
    let foundUrls = [];

    if (body) {
        try {
            // 简单处理 JSON 转义字符防止截断
            let cleanBody = body.replace(/\\\//g, '/');

            let rtmpMatch = cleanBody.match(/rtmp:\/\/[^\s'"<>\\]+/g) || [];
            let webrtcMatch = cleanBody.match(/webrtc:\/\/[^\s'"<>\\]+/g) || [];
            let szierMatch = cleanBody.match(/[a-z0-9-]+\.szier2\.com\/live\/[a-z0-9_]+\?txSecret=[a-f0-9]+&txTime=[a-f0-9]+/g) || [];

            rtmpMatch.forEach(link => {
                if (link.includes("sourcelandchina.com")) {
                    link = link.replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
                }
                foundUrls.push(link);
            });

            webrtcMatch.forEach(link => foundUrls.push(link));
            szierMatch.forEach(link => foundUrls.push("webrtc://" + link));

        } catch (e) {
            console.log("正则解析异常: " + e);
        }
    }

    if (foundUrls.length > 0) {
        let uniqueUrls = [...new Set(foundUrls)];
        let subtitle = `🔥 成功捕获 ${uniqueUrls.length} 个直播源`;
        let message = uniqueUrls.join('\n\n');

        $notify("📡 番茄直播 API 检测", subtitle, message, { "clipboard": uniqueUrls[0] });
        console.log("API 抓取成功:\n" + message);
    }

    // 🔥🔥🔥 极其关键：只做读取，绝对不可以替换 $response.body！否则会破坏原 App 数据导致 App 内报错网络异常！
    $done({});
}
