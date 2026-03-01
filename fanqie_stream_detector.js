/**
 * Quantumult X 直播源抓取与通知脚本 (全量 API 嗅探版)
 */

let url = $request.url;

if (typeof $response === "undefined") {
    // 拉流请求拦截
    let extracted = "";
    if (url.includes("sourcelandchina.com/live")) {
        extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
    } else if (url.includes("szier2.com/live")) {
        extracted = url.replace(/^https?:\/\//, "webrtc://");
    }

    if (extracted !== "") {
        $notify("📡 番茄直接推流", "抓取成功", extracted, { "clipboard": extracted });
    }
    $done({});
} else {
    // API 响应拦截
    let body = $response.body;
    let foundUrls = [];

    if (body) {
        try {
            // 清理转义符
            let cleanBody = body.replace(/\\\//g, '/').replace(/\\u/g, '%u');
            cleanBody = unescape(cleanBody);

            // 暴力匹配 API 中出现的所有可能代表“拉流”的链接 (包含 pull, live, rtmp, webrtc, flv, m3u8 等关键字)
            let allUrls = cleanBody.match(/(https?|rtmp|webrtc):\/\/[^"'\s<>\\]*(live|pull|szier|sourceland|\.flv|\.m3u8)[^"'\s<>\\]*/gi) || [];

            allUrls.forEach(link => {
                // 过滤掉无关的内部 API 链接
                if (!link.includes("hwcloudlive.com/v2/log") && !link.includes("api.demoyf.top")) {
                    foundUrls.push(link);
                }
            });

        } catch (e) {
            console.log("正则解析异常: " + e);
        }
    }

    if (foundUrls.length > 0) {
        let uniqueUrls = [...new Set(foundUrls)];

        // 尝试自动转换为适合播放的协议格式
        let formattedUrls = uniqueUrls.map(link => {
            if (link.includes("webrtc://")) return link;
            if (link.includes("rtmp://")) return link;
            // 启发式转换
            if (link.includes("szier2.com") || link.includes("webrtc")) {
                return link.replace(/^https?:\/\//, "webrtc://");
            }
            if (link.includes("sourcelandchina.com")) {
                let rtmp = link.replace(/^https?:\/\//, "rtmp://").replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
                return rtmp;
            }
            return link;
        });

        let finalUrls = [...new Set(formattedUrls)];
        let message = finalUrls.join('\n\n');

        $notify("📡 成功从 API 中提取源", `捕获 ${finalUrls.length} 个直播源`, message, { "clipboard": finalUrls[0] });
    }

    $done({});
}
