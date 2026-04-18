# Quantumult X 接入说明

这套是给 `iPhone + Quantumult X + 电脑接收器` 用的通用模板。

## 电脑端

- 启动接收器：
  - `直播源接收器_QuantumultX版.py`
- 当前接收地址：
  - `http://192.168.6.101:8310/submit`
- 状态页：
  - `http://192.168.6.101:8310/status`
- 落盘目录：
  - `C:\Users\Administrator\Documents\stream_data_qx`

## 手机端文件

把下面两个脚本放进 `Quantumult X` 的 `Scripts` 目录：

- `qx_report_request_url.js`
- `qx_report_response_urls.js`

把下面这个片段放到 Git 里托管，或直接导入：

- [`QuantumultX_接收器接入模板.snippet`](../snippets/QuantumultX_%E6%8E%A5%E6%94%B6%E5%99%A8%E6%8E%A5%E5%85%A5%E6%A8%A1%E6%9D%BF.snippet)

## 接入思路

1. `script-request-header`
   - 命中后，把当前请求 URL 上报到电脑接收器
   - 不改原请求，原请求继续放行

2. `script-response-body`
   - 命中后，扫描响应体里的 `m3u8 / flv / rtmp`
   - 找到后批量上报到电脑接收器
   - 不改原响应内容

## 使用方法

1. 先确认手机和电脑在同一个 Wi-Fi
2. 在 Quantumult X 里导入 snippet
3. 把 `example\.com` 改成你自己的测试域名
4. 如果你要看 HTTPS 内容，给对应测试域名加到 `hostname`，并在 Quantumult X 里完成 MitM 证书设置
5. 打开测试页面或测试接口
6. 电脑端查看：
   - `latest_*.json`
   - `captures_YYYYMMDD.ndjson`

## 重点注意

- 这套模板只负责把命中的 URL 或响应体里的直播链接上报到电脑。
- 它不是 Android 模拟器那套“本地真 key + 桥接远端 m3u8”的 1:1 替代。
- 如果关键数据只存在于 App 本地 `127.0.0.1` 或私有播放器里，Quantumult X 未必拿得到。
