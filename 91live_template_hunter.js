// Quantumult X Script: 91 Live Template Hunter
// Function: 截获 /room/recommend/anchor/list 的查询发包请求体，并通过 Ntfy 发送给电脑接收端

var ntfy_topic = "xBoss_91Live_GlobalTemplate_Hunter_666";

if ($request) {
    try {
        var endpoint = $request.url;
        var method = $request.method;
        var headers = $request.headers;
        var body = $request.body || "";

        if (endpoint.indexOf("/room/recommend/anchor/list") !== -1) {
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
                console.log("Template published to ntfy successfully.");
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
