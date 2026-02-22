/**
 * 鲍鱼盒子 VIP 密钥 (Token) 自动提取脚本
 * 配合圈 X 使用，拦截请求头并推送通知
 */

let reqHeaders = $request.headers;
let vipToken = "";

// 遍历请求头，寻找 authorization 或 token 字段（忽略大小写）
for (let key in reqHeaders) {
    if (key.toLowerCase() === "authorization" || key.toLowerCase() === "token") {
        vipToken = reqHeaders[key];
        break;
    }
}

if (vipToken) {
    // 触发系统通知，利用圈 X 的通知机制展示密钥
    // iOS 系统中，长按通知或下拉通知即可直接复制里面的文本
    $notify("🔑 鲍鱼盒子 VIP 密钥提取成功", "👉 请长按或展开本通知复制下方内容", vipToken);
    console.log("【密钥提取成功】: " + vipToken);
} else {
    console.log("【密钥提取失败】未在请求头中找到 authorization 字段");
}

// 提取完毕，放行请求，不影响原有的破解逻辑
$done({});
