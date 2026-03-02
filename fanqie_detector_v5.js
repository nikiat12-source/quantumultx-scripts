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
                            // 改成 RTMP 格式要求
                            let rtmpUrl = "rtmp://" + domain + "/live/" + streamName;
                            foundUrls.push(rtmpUrl);
                        }
                    });
                }
            } catch (e) {
                // 回退机制
            }
        }

        if (foundUrls.length > 0) {
            let uniqueUrls = [...new Set(foundUrls)];
            let msg = uniqueUrls.join('\n');

            // 向电脑端 Python 脚本发送数据 (请将 192.168.x.x 替换为你电脑的局域网 IPv4 地址)
            let pc_ip = "192.168.6.101"; // <--- 用户需要手动修改这里
            let uploadRequest = {
                url: "http://" + pc_ip + ":8239/submit",
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                },
                body: msg
            };
            $task.fetch(uploadRequest).then(response => {
                // 静默成功
            }, reason => {
                // 静默失败
            });
        }

        $done({});
    }
    // 拦截拉流请求 (script-request-header)
    else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
        let extracted = url.replace(/^https?:\/\//, "rtmp://");
        if (url.includes("sourcelandchina.com")) {
            extracted = url.replace(/^https?:\/\//, "rtmp://").replace(/livefpad/g, "live");
        }

        let pc_ip = "192.168.6.101"; // <--- 用户需要手动修改这里
        let uploadRequest = {
            url: "http://" + pc_ip + ":8239/submit",
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: extracted
        };
        $task.fetch(uploadRequest).then(response => { }, reason => { });
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
