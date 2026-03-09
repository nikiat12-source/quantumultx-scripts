/*
Quantumult X request reporter

把命中的请求 URL 上报到电脑接收器，然后原请求继续放行。
建议把这个文件放到：
On My iPhone/Quantumult X/Scripts/
或 iCloud Drive/Quantumult X/Scripts/
*/

const RECEIVER_URL = "http://192.168.6.101:8310/submit";
const SOURCE = "QuantumultX";
const DEVICE = "iPhone";
const KIND = "request-url";

function finish() {
  $done({});
}

function report(url) {
  if (!url) {
    finish();
    return;
  }

  const payload = {
    source: SOURCE,
    device: DEVICE,
    kind: KIND,
    url: url,
    text: url,
  };

  $task.fetch({
    url: RECEIVER_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(() => {
    finish();
  }, () => {
    finish();
  });
}

try {
  report(($request && $request.url) || "");
} catch (e) {
  finish();
}
