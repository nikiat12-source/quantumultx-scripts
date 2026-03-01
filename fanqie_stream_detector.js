/**
 * Quantumult X 直播源抓取与通知脚本
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
        let decodedBody = body.replace(/\\u/g, "%u").replace(/\\/g, "");
        decodedBody = unescape(decodedBody);

        let rtmpMatch = decodedBody.match(/rtmp:\/\/[^\s'"<>\\]+/g) || [];
        let webrtcMatch = decodedBody.match(/webrtc:\/\/[^\s'"<>\\]+/g) || [];
        let szierMatch = decodedBody.match(/[a-z0-9-]+\.szier2\.com\/live\/[a-z0-9_]+\?txSecret=[a-f0-9]+&txTime=[a-f0-9]+/g) || [];

        let foundUrls = [];

        rtmpMatch.forEach(link => {
            if (link.includes("sourcelandchina.com")) {
                link = link.replace(/\/livefpad/g, "/live").replace(/livefpad/g, "live");
            }
            foundUrls.push(link);
        });

        webrtcMatch.forEach(link => foundUrls.push(link));
        szierMatch.forEach(link => foundUrls.push("webrtc://" + link));

        if (foundUrls.length > 0) {
            let uniqueUrls = [...new Set(foundUrls)];
            let subtitle = `🔥 成功捕获 ${uniqueUrls.length} 个直播源`;
            let message = uniqueUrls.join('\n\n');

            $notify("📡 番茄直播源检测", subtitle, message, { "clipboard": uniqueUrls[0] });
            console.log("【番茄直播源探测】抓取成功:\n" + message);
        }
    } catch (e) {
        console.log("直播源抓取脚本解析异常: " + e);
    }
}

$done({ body: $response.body });
