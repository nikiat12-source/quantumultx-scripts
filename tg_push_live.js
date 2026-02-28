// QX Script: tg_push_live.js
// 作用: 监控特定的视频流请求，并将 URL 推送到 Telegram 机器人。


const tgChatId = "您的实际Chat_ID"; // 请替换为您真实的 Chat ID

let requestUrl = $request.url;

// 检查是否是我们想要的 .flv 直播流链接 (根据之前的抓包，流链接通常包含 .flv 和 auth_key)
if (requestUrl.indexOf(".flv") !== -1 && requestUrl.indexOf("auth_key=") !== -1) {
    
    // 构造发送到 Telegram 的消息内容
    let messageText = "🎥 **捕获到新的直播流链接**\n\n";
    messageText += "🔗 `M3U8 / FLV 链接:`\n`" + requestUrl + "`\n\n";
    messageText += "👉 *您可以复制此链接到 PotPlayer 或 VLC 等播放器中直接纯净观看。*";

    // 构造请求 Telegram API 的参数
    let tgApiUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    let tgRequest = {
        url: tgApiUrl,
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            chat_id: tgChatId,
            text: messageText,
            parse_mode: "Markdown"
        })
    };

    // 发送异步请求到 Telegram
    $task.fetch(tgRequest).then(response => {
        if (response.statusCode === 200) {
            console.log("成功推送到 Telegram!");
        } else {
            console.log("推送 Telegram 失败，状态码: " + response.statusCode);
            console.log("响应内容: " + response.body);
        }
    }, reason => {
        console.log("请求 Telegram API 出错: " + reason.error);
    });
}

// 必须调用 $done 放行原始请求，否则视频会无法播放
$done({});
