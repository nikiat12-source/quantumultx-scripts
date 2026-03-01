/**
 * Quantumult X 直播源抓取与通知脚本
 * 远程调用地址建议： https://raw.githubusercontent.com/nikiat12-source/quantumultx-scripts/main/fanqie_stream_detector.js
 *
 * [rewrite_local]
 * ^https?:\/\/.*\/.*(live|room|Info).* url script-response-body https://raw.githubusercontent.com/nikiat12-source/quantumultx-scripts/main/fanqie_stream_detector.js
 *
 * [mitm]
 * hostname = *
 */

let body = $response.body;
let url = $request.url;

if (body) {
    try {
        // 应对 unicode 转义或转义字符
        let decodedBody = body.replace(/\\u/g, "%u").replace(/\\/g, "");
        decodedBody = unescape(decodedBody);

        let rtmpMatch = decodedBody.match(/rtmp:\/\/[^\s'"<>\\]+/g) || [];
        let webrtcMatch = decodedBody.match(/webrtc:\/\/[^\s'"<>\\]+/g) || [];
        let szierMatch = decodedBody.match(/[a-z0-9-]+\.szier2\.com\/live\/[a-z0-9_]+\?txSecret=[a-f0-9]+&txTime=[a-f0-9]+/g) || [];

        let foundUrls = [];

        // Rtmp 处理
        rtmpMatch.forEach(link => {
            // 根据 Python 脚本逻辑，拼接或清理 URL
            if (link.includes("sourcelandchina.com")) {
                link = link.replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
            }
            foundUrls.push(link);
        });

        // WebRTC 处理
        webrtcMatch.forEach(link => foundUrls.push(link));
        szierMatch.forEach(link => foundUrls.push("webrtc://" + link));

        if (foundUrls.length > 0) {
            // 去重
            let uniqueUrls = [...new Set(foundUrls)];
            
            // 构建通知内容
            let subtitle = `🔥 成功捕获 ${uniqueUrls.length} 个直播源`;
            let message = uniqueUrls.join('\n\n');
            
            // 第一个链接直接复制到剪贴板，或者点击通知复制
            $notify("📡 番茄直播源检测", subtitle, message, { "clipboard": uniqueUrls[0] });
            console.log("【番茄直播源探测】抓取成功:\n" + message);
        }
    } catch (e) {
        console.log("直播源抓取脚本解析异常: " + e);
    }
}

$done({});
