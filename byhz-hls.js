/*
鲍鱼盒子 HLS直播提取辅助JS - 最终远程版
功能：捕获房间详情、index.m3u8、key.key 并弹出完整通知
更新日期：2026-02-22
*/

const url = $request.url;
const body = $response.body || '';

if (url.includes('/live/room/detail')) {
  let obj;
  try { obj = JSON.parse(body); } catch (e) { obj = {}; }
  
  function findStreams(o, results = { m3u8: [], key: [] }) {
    if (typeof o === 'string') {
      if (o.includes('.m3u8')) results.m3u8.push(o);
      if (o.length >= 20 && o.length <= 50 && /^[a-zA-Z0-9+/=]+$/.test(o)) results.key.push(o);
      return;
    }
    if (Array.isArray(o)) { o.forEach(item => findStreams(item, results)); return; }
    if (typeof o === 'object' && o !== null) { Object.values(o).forEach(v => findStreams(v, results)); }
  }
  
  const results = { m3u8: [], key: [] };
  findStreams(obj, results);
  
  if (results.m3u8.length > 0 || results.key.length > 0) {
    const msg = `M3U8地址：\n${results.m3u8.join('\n') || '未找到'}\n\nAES密钥（明文）：\n${results.key.join('\n') || '未找到'}`;
    $notification.post('鲍鱼盒子 - 房间详情提取成功', '远程JS已运行', msg);
  }
  
} else if (url.includes('index.m3u8')) {
  let m3u8Url = url;
  let keyUrl = '未找到';
  
  const keyRegex = /#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/i;
  const match = body.match(keyRegex);
  if (match) {
    keyUrl = match[1];
    if (!keyUrl.startsWith('http')) {
      const base = url.substring(0, url.lastIndexOf('/') + 1);
      keyUrl = base + keyUrl.replace(/^\//, '');
    }
  }
  
  const msg = `M3U8：${m3u8Url}\n\nKey URL：${keyUrl}\n\n请立即复制后关闭App`;
  $notification.post('鲍鱼盒子 - HLS直播流', 'index.m3u8 已捕获', msg);
  
} else if (url.match(/\.key($|\?)/)) {
  let keyInfo = '未解析';
  if ($response.bodyBytes) {
    const bytes = new Uint8Array($response.bodyBytes);
    keyInfo = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } else if (body) {
    keyInfo = body.trim();
  }
  $notification.post('鲍鱼盒子 - AES密钥', 'key.key 已捕获', `密钥内容（Hex/明文）：${keyInfo}`);
}

$done({});