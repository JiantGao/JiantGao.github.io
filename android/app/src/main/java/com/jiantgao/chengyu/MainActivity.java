package com.jiantgao.chengyu;

import android.os.Bundle;
import android.view.View;

import androidx.core.view.ViewCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Android 15/16 强制 edge-to-edge，系统会忽略 setDecorFitsSystemWindows /
 * windowOptOutEdgeToEdgeEnforcement 等退出方法。
 * 正确做法：拥抱 edge-to-edge，在内容根视图消费「顶部 inset（状态栏/挖孔高度）」，
 * 把整个内容（含 WebView）物理垫到摄像头下方。这是 Android 官方推荐的 insets 处理方式。
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            int top = insets.getSystemWindowInsetTop();
            v.setPadding(0, top, v.getPaddingRight(), v.getPaddingBottom());
            return insets;
        });
    }
}
