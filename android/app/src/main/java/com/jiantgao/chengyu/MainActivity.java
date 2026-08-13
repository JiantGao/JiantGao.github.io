package com.jiantgao.chengyu;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

/**
 * Android 15/16 强制 edge-to-edge，会忽略 setDecorFitsSystemWindows / windowOptOutEdgeToEdgeEnforcement。
 * 因此这里直接读取状态栏高度（含挖孔摄像头区域），把 WebView 整体向下垫高，
 * 让内容物理上从摄像头下方开始——不依赖任何系统开关，任何设备都生效。
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final View webView = getBridge().getWebView();
        webView.post(() -> {
            int top = statusBarHeight();
            if (top > 0) {
                webView.setPadding(0, top, 0, 0);
            }
        });
    }

    /** 状态栏高度（像素）；挖孔/刘海屏的 status_bar_height 已包含摄像头区域 */
    private int statusBarHeight() {
        int res = 0;
        int id = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (id > 0) {
            res = getResources().getDimensionPixelSize(id);
        }
        return res;
    }
}
