package vn.kenhcuame.app;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlayerChrome")
public class PlayerChromePlugin extends Plugin {

    @PluginMethod
    public void enterFullscreen(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
            call.resolve();
        });
    }

    @PluginMethod
    public void exitFullscreen(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView())
                .show(WindowInsetsCompat.Type.systemBars());
            call.resolve();
        });
    }
}
