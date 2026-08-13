package com.jiantgao.chengyu;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * 应用内容不绘制到状态栏/挖孔摄像头下方。
 * Capacitor 8 默认 edge-to-edge，WebView 会顶到屏幕顶部被摄像头遮挡；
 * 这里在 onCreate 与 onResume 强制 setDecorFitsSystemWindows(true)，
 * 让内容从状态栏下方开始（标准 Android 做法，覆盖 Capacitor 的 edge-to-edge）。
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        fitSystemWindows();
    }

    @Override
    public void onResume() {
        super.onResume();
        fitSystemWindows();
    }

    private void fitSystemWindows() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
