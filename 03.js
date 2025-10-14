let body = JSON.parse($response.body);

// 修改响应体内容
body = {"i":"V330","r":0,"e":"9D9ICLXK-16ceGtlRlji8m9klzsTqXhzELYftQLjZWBCx2ydEnuUr-AQmVAVBpPUGKrLLaboKCTNjeVgPgj2Io2aRcdU1hGKbjvGNUelf-oUuMopJFnQHvRArae1NfInsLaZj5qyVuAVSB-ctQheKmWwlO_z3FY_1rPAe8SvDWgqY7mvss-UMm-C-r8BNEO7sIeFqDGGcq_Hv1maIMY1LpQzsDbBfRL9"}
;

$done({body: JSON.stringify(body)});
