package vn.kenhcuame.app;

import android.app.PendingIntent;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {

    private static final String ERROR_NEEDS_INTERACTION = "needs-interaction";
    private static final String ERROR_CANCELLED = "cancelled";
    private static final String ERROR_FAILED = "failed";

    private ActivityResultLauncher<IntentSenderRequest> consentLauncher;
    private PluginCall pendingConsentCall;

    @Override
    public void load() {
        consentLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                PluginCall call = pendingConsentCall;
                pendingConsentCall = null;
                if (call == null) {
                    return;
                }
                try {
                    AuthorizationResult authorization = Identity.getAuthorizationClient(getActivity())
                        .getAuthorizationResultFromIntent(result.getData());
                    resolveWithToken(call, authorization);
                } catch (ApiException e) {
                    call.reject("Consent was not granted", ERROR_CANCELLED, e);
                }
            }
        );
    }

    @PluginMethod
    public void authorize(PluginCall call) {
        List<Scope> scopes;
        try {
            scopes = readScopes(call.getArray("scopes", new JSArray()));
        } catch (JSONException e) {
            call.reject("Invalid scopes", ERROR_FAILED, e);
            return;
        }
        boolean interactive = Boolean.TRUE.equals(call.getBoolean("interactive", true));
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(scopes).build();
        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener(result -> {
                if (!result.hasResolution()) {
                    resolveWithToken(call, result);
                    return;
                }
                PendingIntent pendingIntent = result.getPendingIntent();
                if (!interactive || pendingIntent == null) {
                    call.reject("User interaction required", ERROR_NEEDS_INTERACTION);
                    return;
                }
                pendingConsentCall = call;
                consentLauncher.launch(new IntentSenderRequest.Builder(pendingIntent.getIntentSender()).build());
            })
            .addOnFailureListener(e -> call.reject(String.valueOf(e.getMessage()), ERROR_FAILED, e));
    }

    private static List<Scope> readScopes(JSArray raw) throws JSONException {
        List<Scope> scopes = new ArrayList<>();
        for (int i = 0; i < raw.length(); i++) {
            scopes.add(new Scope(raw.getString(i)));
        }
        return scopes;
    }

    private static void resolveWithToken(PluginCall call, AuthorizationResult result) {
        String token = result.getAccessToken();
        if (token == null) {
            call.reject("No access token returned", ERROR_FAILED);
            return;
        }
        JSObject payload = new JSObject();
        payload.put("accessToken", token);
        JSArray granted = new JSArray();
        for (String scope : result.getGrantedScopes()) {
            granted.put(scope);
        }
        payload.put("grantedScopes", granted);
        call.resolve(payload);
    }
}
