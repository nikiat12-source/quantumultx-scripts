/*
  Duocai Quantumult X capture relay - ntfy edition
  Goal:
  1. Forward request/response texts to desktop
  2. Preserve enough material for later desktop-side analysis
  3. Still report direct live URLs when they appear
*/

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "duocai-relay-mobile-ntfy";
const MESSAGE_PREFIX = "QX_STREAM";
const DEDUPE_KEY = "qx_duocai_capture_marker";
const DEDUPE_TIME_KEY = "qx_duocai_capture_time";
const DEDUPE_SECONDS = 8;

const STREAM_RE = /(webrtc:\/\/[^\s"'<>]+|rtmp:\/\/[^\s"'<>]+|https?:\/\/[^\s"'<>]+?\.(?:flv|m3u8)(?:\?[^\s"'<>]*)?)/ig;
const DUOCAI_UA_RE = /%E5%A4%9A%E5%BD%A9|多彩|CFNetwork\/3860\.500\.112/i;
const DUOCAI_HOST_RE = /(sdkdc\.tlivesdk\.com|sourcelandchina\.com|hebeisaixin\.com|7kv5kqq7k77g)/i;
const CLUE_RE = /(liteav|play_url|playUrl|stream_url|streamUrl|str_stream_url|rtmp:\/\/|webrtc:\/\/|\.flv|\.m3u8|<playpath>)/i;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shouldSkip(marker) {
  const last = $prefs.valueForKey(DEDUPE_KEY) || "";
  const lastTime = parseInt($prefs.valueForKey(DEDUPE_TIME_KEY) || "0", 10);
  return last === marker && nowSeconds() - lastTime < DEDUPE_SECONDS;
}

function remember(marker) {
  $prefs.setValueForKey(marker, DEDUPE_KEY);
  $prefs.setValueForKey(String(nowSeconds()), DEDUPE_TIME_KEY);
}

function pickText(value) {
  if (typeof value === "undefined" || value === null) return "";
  return String(value);
}

function truncate(text, maxLen) {
  const input = pickText(text);
  return input.length > maxLen ? input.slice(0, maxLen) : input;
}

function matchUrls(text) {
  const input = pickText(text);
  const matches = input.match(STREAM_RE);
  return matches ? Array.from(new Set(matches.map(item => String(item).trim()).filter(Boolean))) : [];
}

function shouldCapture(requestUrl, requestHeaders, requestBody, responseBody) {
  const requestUrlText = pickText(requestUrl);
  const requestHeadersText = buildHeadersText(requestHeaders, "");
  const joined = [requestUrlText, requestHeadersText, pickText(requestBody), pickText(responseBody)].join("\n");
  const ua = `${requestHeaders["User-Agent"] || requestHeaders["user-agent"] || ""}`;
  if (DUOCAI_HOST_RE.test(requestUrlText)) return true;
  if (DUOCAI_UA_RE.test(ua)) return true;
  if (DUOCAI_UA_RE.test(requestHeadersText) && CLUE_RE.test(joined)) return true;
  if (CLUE_RE.test(joined) && DUOCAI_UA_RE.test(joined)) return true;
  return false;
}

function buildHeadersText(headers, startLine) {
  const lines = [];
  if (startLine) lines.push(startLine);
  const obj = headers || {};
  Object.keys(obj).forEach(key => {
    lines.push(`${key}: ${obj[key]}`);
  });
  return lines.join("\n");
}

function buildPayload() {
  const requestUrl = ($request && $request.url) || "";
  const method = ($request && $request.method) || "GET";
  const requestHeaders = ($request && $request.headers) || {};
  const responseHeaders = (typeof $response !== "undefined" && $response && $response.headers) ? $response.headers : {};
  const requestBody = truncate(($request && typeof $request.body !== "undefined") ? $request.body : "", 12000);
  const responseBody = truncate((typeof $response !== "undefined" && $response && typeof $response.body !== "undefined") ? $response.body : "", 16000);

  if (!shouldCapture(requestUrl, requestHeaders, requestBody, responseBody)) {
    return null;
  }

  const candidates = [
    ...matchUrls(requestUrl),
    ...matchUrls(requestBody),
    ...matchUrls(responseBody),
  ];

  const uniqueCandidates = Array.from(new Set(candidates));
  const marker = [
    requestUrl,
    requestBody.slice(0, 240),
    responseBody.slice(0, 240),
    uniqueCandidates.slice(0, 3).join("|"),
  ].join("||");

  return {
    marker,
    payload: {
      source: "QuantumultX",
      kind: "capture_bundle",
      request_url: requestUrl,
      request_method: method,
      request_headers_text: buildHeadersText(requestHeaders, `${method} ${requestUrl}`),
      request_body_text: requestBody,
      response_headers_text: buildHeadersText(responseHeaders, "HTTP/1.1"),
      response_body_text: responseBody,
      candidate_urls: uniqueCandidates,
      captured_at: new Date().toISOString(),
    },
  };
}

function pushToNtfy(payload) {
  return $task.fetch({
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "duocai capture bundle",
      "Priority": "3",
      "Tags": "satellite",
    },
    body: `${MESSAGE_PREFIX} ${JSON.stringify(payload)}`,
  });
}

async function main() {
  const built = buildPayload();
  if (!built) {
    $done({});
    return;
  }
  if (shouldSkip(built.marker)) {
    $done({});
    return;
  }
  remember(built.marker);

  try {
    await pushToNtfy(built.payload);
  } catch (e) {}

  $done({});
}

main();
