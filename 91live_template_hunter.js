// Quantumult X Script: 91 Live Template Hunter
// Function: 截获特定域名下发出的加密报文请求，推送至电脑端接收器让它进行解密分析
var ntfy_topic = "xBoss_91Live_GlobalTemplate_Hunter_666";

if ($request) {
    try {
        var endpoint = $request.url;
        var method = $request.method;
        var headers = $request.headers;
        var body = $request.body || "";

        if (method === "POST") {
            var payload = {
                type: "api_template",
                url: endpoint,
                method: method,
                headers: headers,
                body: body,
                timestamp: new Date().getTime()
            };

            var postRequest = {
                url: "https://ntfy.sh/" + ntfy_topic,
                method: "POST",
                headers: {
                    "Title": "91 Live Anchor Template Captured!",
                    "Tags": "robot,zap",
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify(payload)
            };

            $task.fetch(postRequest).then(response => {
                console.log("Encrypted Template published to ntfy successfully.");
                $done({});
            }, reason => {
                console.log("Failed to publish to ntfy: " + reason.error);
                $done({});
            });
        } else {
            $done({});
        }
    } catch (e) {
        console.log("Template extraction error: " + e);
        $done({});
    }
} else {
    $done({});
}
