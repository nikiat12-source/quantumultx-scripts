/**
 * @filename: live_stream_notify.js
 * @description: 拦截特定请求，捕获直播源 URL 并触发 QX 系统通知
 */

const url = $request.url;

// 可以在 QX 日志中留个底，方便后续复盘调试
console.log(`[直播嗅探] 成功捕获流媒体地址: ${url}`);

// 触发 Quantumult X 通知
// $notify(title, subtitle, body)
$notify(
    "📡 捕获到直播源", 
    "抓取成功", 
    `链接:\n${url}`
);

// 直接放行请求，不阻断、不修改原有网络流量
$done({});
