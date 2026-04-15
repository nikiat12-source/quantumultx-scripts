/**
 * Quantumult X live stream capture - Mobile network ntfy relay edition
 * xiaohongmao enhanced build
 */

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "fanqie-relay-7f29c6b4-9d4f-4d91-9e7f-31d8b6cc0d2a";
const MESSAGE_PREFIX = "QX_STREAM";

const MAP_KEY = "qx_xmh_room_map_v1";
const DEDUPE_KEY = "qx_xmh_last_payload_v1";
const DEDUPE_SECONDS = 20;
const DEDUPE_TIME_KEY = "qx_xmh_last_time_v1";

const url = ($request && $request.url) || "";
const method = ($request && $request.method) || "";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function loadMap() {
  try {
    const raw = $prefs.valueForKey(MAP_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveMap(data) {
  try {
    $prefs.setValueForKey(JSON.stringify(data), MAP_KEY);
  } catch (e) {}
}

function simpleHash(text) {
  const input = String(text || "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function shouldSkip(payloadText) {
  const hash = simpleHash(payloadText);
  const lastHash = $prefs.valueForKey(DEDUPE_KEY) || "";
  const lastTime = parseInt($prefs.valueForKey(DEDUPE_TIME_KEY) || "0", 10);
  if (hash === lastHash && nowSeconds() - lastTime < DEDUPE_SECONDS) {
    return true;
  }
  $prefs.setValueForKey(hash, DEDUPE_KEY);
  $prefs.setValueForKey(String(nowSeconds()), DEDUPE_TIME_KEY);
  return false;
}

function sendToNtfy(obj) {
  const payloadText = JSON.stringify(obj);
  if (shouldSkip(payloadText)) {
    $done({});
    return;
  }
  const endpoint = `${NTFY_SERVER}/${NTFY_TOPIC}`;
  $task.fetch({
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "QX xmh relay",
      "Tags": "satellite_dish",
    },
    body: `${MESSAGE_PREFIX} ${payloadText}`,
  }).then(
    () => console.log("[ntfy] xmh payload sent"),
    (err) => console.log(`[ntfy] Send failed: ${err}`)
  );
}

function parseRoomIdFromStreamName(streamName) {
  const m = String(streamName || "").match(/^s(\d+)_/);
  return m ? m[1] : "";
}

function handleHwLogReport() {
  const body = ($request && $request.body) ? String($request.body) : "";
  if (!body) return;
  try {
    const logData = JSON.parse(body);
    if (!logData || !Array.isArray(logData.logs)) return;
    const map = loadMap();
    for (const log of logData.logs) {
      if (!log || !log.domain || !log.streamName || String(log.streamName).indexOf("txSecret") === -1) continue;
      const roomId = parseRoomIdFromStreamName(log.streamName);
      const streamCore = String(log.streamName).split("?")[0];
      const merged = map[roomId] || {};
      sendToNtfy({
        source: "QuantumultX",
        kind: "xmh_stream_signature",
        request_url: url,
        method: method,
        room_id: roomId,
        anchor_id: merged.anchor_id || "",
        nickname: merged.nickname || "",
        stream_core: streamCore,
        stream_name: String(log.streamName),
        domain: log.domain,
        limit_key: merged.limit_key || "",
        sid: merged.sid || "",
        bsid: merged.bsid || "",
        rtmp_url: `rtmp://${log.domain}/live/${log.streamName}`,
        flv_url: `http://${log.domain}/live/${streamCore}.flv?${String(log.streamName).split("?")[1] || ""}`,
        captured_at: new Date().toISOString(),
      });
    }
  } catch (e) {}
}

function handleDirectLiveUrl() {
  if (!(url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live"))) return;
  const directUrl = String(url);
  const streamPart = directUrl.split("/live/")[1] || "";
  const streamCore = streamPart.split("?")[0].replace(/\.flv$/i, "");
  const roomId = parseRoomIdFromStreamName(streamCore);
  const map = loadMap();
  const merged = map[roomId] || {};
  sendToNtfy({
    source: "QuantumultX",
    kind: "xmh_direct_live_url",
    request_url: url,
    method: method,
    room_id: roomId,
    anchor_id: merged.anchor_id || "",
    nickname: merged.nickname || "",
    stream_core: streamCore,
    limit_key: merged.limit_key || "",
    sid: merged.sid || "",
    bsid: merged.bsid || "",
    direct_url: directUrl,
    captured_at: new Date().toISOString(),
  });
}

function handleAnchorListResponse() {
  const body = (typeof $response !== "undefined" && $response && $response.body) ? String($response.body) : "";
  if (!body) return;
  try {
    const obj = JSON.parse(body);
    const list = (((obj || {}).data || {}).list) || [];
    if (!Array.isArray(list)) return;
    const map = loadMap();
    let changed = false;
    for (const item of list) {
      const roomId = String(item.curroomnum || "");
      const anchorId = String(item.id || "");
      if (!roomId || !anchorId) continue;
      map[roomId] = {
        room_id: roomId,
        anchor_id: anchorId,
        nickname: item.nickname || "",
        limit_key: item.limit && item.limit.key ? String(item.limit.key) : "",
        sid: item.sid ? String(item.sid) : "",
        bsid: item.bsid ? String(item.bsid) : "",
        updated_at: new Date().toISOString(),
      };
      changed = true;
    }
    if (changed) saveMap(map);
  } catch (e) {}
}

function getQueryParam(name) {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return "";
  const params = {};
  const pairs = url.slice(queryIndex + 1).split("&");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = decodeURIComponent(pair.slice(0, idx));
    const value = decodeURIComponent(pair.slice(idx + 1));
    params[key] = value;
  }
  return params[name] || "";
}

function handleAnchorProfileResponse() {
  const body = (typeof $response !== "undefined" && $response && $response.body) ? String($response.body) : "";
  if (!body || !url.includes("/OpenAPI/v1/user/profile")) return;
  try {
    const obj = JSON.parse(body);
    const data = (obj || {}).data || {};
    const anchorId = String(data.id || "").trim();
    const roomId = String(data.curroomnum || "").trim();
    const nickname = String(data.nickname || "").trim();
    if (!anchorId || !roomId) return;

    const map = loadMap();
    const old = map[roomId] || {};
    map[roomId] = {
      room_id: roomId,
      anchor_id: anchorId,
      nickname: nickname,
      limit_key: old.limit_key || "",
      sid: old.sid || "",
      bsid: old.bsid || "",
      updated_at: new Date().toISOString(),
    };
    saveMap(map);

    sendToNtfy({
      source: "QuantumultX",
      kind: "xmh_anchor_profile_response",
      request_url: url,
      anchor_id: anchorId,
      nickname: nickname,
      room_id: roomId,
      limit_key: old.limit_key || "",
      sid: old.sid || "",
      bsid: old.bsid || "",
      captured_at: new Date().toISOString(),
    });
  } catch (e) {}
}

function handleAnchorContextRequest() {
  const map = loadMap();
  if (url.includes("/OpenAPI/v1/private/getPrivateLimit")) {
    const uid = getQueryParam("uid");
    if (!uid) return;
    sendToNtfy({
      source: "QuantumultX",
      kind: "xmh_private_limit_request",
      request_url: url,
      method: method,
      anchor_id: uid,
      known_rooms: Object.values(map).filter(x => x.anchor_id === uid).map(x => x.room_id),
      captured_at: new Date().toISOString(),
    });
  }
}

if (url.includes("hwcloudlive.com") && url.includes("log_report")) {
  handleHwLogReport();
} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
  handleDirectLiveUrl();
} else if (url.includes("api.qituoc.com/OpenAPI/v1/user/profile") && typeof $response !== "undefined") {
  handleAnchorProfileResponse();
} else if (url.includes("api.qituoc.com/OpenAPI/v1/anchor/") && typeof $response !== "undefined") {
  handleAnchorListResponse();
} else if (url.includes("api.qituoc.com/OpenAPI/v1/private/getPrivateLimit")) {
  handleAnchorContextRequest();
}

$done({});
