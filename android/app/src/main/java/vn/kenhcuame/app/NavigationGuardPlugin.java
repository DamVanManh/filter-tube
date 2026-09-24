package vn.kenhcuame.app;

import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Set;

@CapacitorPlugin(name = "NavigationGuard")
public class NavigationGuardPlugin extends Plugin {

    private static final String APP_HOST = "localhost";
    private static final Set<String> EMBED_HOSTS = Set.of("www.youtube-nocookie.com", "www.youtube.com");
    private static final String EMBED_PATH_PREFIX = "/embed/";

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        String host = url.getHost();
        if (APP_HOST.equals(host)) {
            return null;
        }
        String path = url.getPath();
        boolean isEmbed = host != null && EMBED_HOSTS.contains(host) && path != null && path.startsWith(EMBED_PATH_PREFIX);
        return !isEmbed;
    }
}
