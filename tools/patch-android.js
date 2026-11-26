// Modifica il progetto Android generato da Capacitor:
// permessi, versionCode crescente e firma sempre con la stessa chiave.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'android');
const manifestPath = path.join(root, 'app', 'src', 'main', 'AndroidManifest.xml');
const gradlePath = path.join(root, 'app', 'build.gradle');

// --- Permessi
let manifest = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.CAMERA',
  'android.permission.MODIFY_AUDIO_SETTINGS'
];
for (const p of perms) {
  if (!manifest.includes(p)) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
if (!manifest.includes('android.hardware.camera')) {
  manifest = manifest.replace('</manifest>',
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
}
fs.writeFileSync(manifestPath, manifest);

// --- Versione e firma
let gradle = fs.readFileSync(gradlePath, 'utf8');
const run = parseInt(process.env.VERSION_CODE || '1', 10);
const versionCode = 100 + run;
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "1.0.${run}"`);

const ks = (process.env.KEYSTORE_FILE || '').replace(/\\/g, '/');
if (ks && !gradle.includes('signingConfigs')) {
  const signing = `
    signingConfigs {
        release {
            storeFile file("${ks}")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "armadio"
            keyPassword System.getenv("KEYSTORE_PASSWORD")
        }
    }
`;
  gradle = gradle.replace(/android\s*\{/, m => m + signing);
  gradle = gradle.replace(/buildTypes\s*\{\s*release\s*\{/, m => m + '\n            signingConfig signingConfigs.release');
}
fs.writeFileSync(gradlePath, gradle);
// --- Tasti fisici (volume, telecomandi Bluetooth, tasto fotocamera) inoltrati all'app
const javaDir = path.join(root, 'app', 'src', 'main', 'java', 'app', 'armadio', 'guardaroba');
fs.mkdirSync(javaDir, { recursive: true });
fs.writeFileSync(path.join(javaDir, 'HwKeysPlugin.java'), `package app.armadio.guardaroba;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HwKeys")
public class HwKeysPlugin extends Plugin {
    static volatile boolean capturing = false;

    @PluginMethod
    public void capture(PluginCall call) {
        capturing = Boolean.TRUE.equals(call.getBoolean("on", false));
        call.resolve();
    }

    void fire(String key) {
        JSObject o = new JSObject();
        o.put("key", key);
        notifyListeners("key", o);
    }
}
`);
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package app.armadio.guardaroba;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HwKeysPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private String keyName(int k) {
        switch (k) {
            case KeyEvent.KEYCODE_VOLUME_UP: return "VOL_UP";
            case KeyEvent.KEYCODE_VOLUME_DOWN: return "VOL_DOWN";
            case KeyEvent.KEYCODE_CAMERA: return "CAMERA";
            case KeyEvent.KEYCODE_FOCUS: return "FOCUS";
            case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER: case KeyEvent.KEYCODE_DPAD_CENTER: return "ENTER";
            case KeyEvent.KEYCODE_SPACE: return "SPACE";
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_MEDIA_PLAY: case KeyEvent.KEYCODE_MEDIA_PAUSE:
            case KeyEvent.KEYCODE_HEADSETHOOK: case KeyEvent.KEYCODE_MEDIA_NEXT: case KeyEvent.KEYCODE_MEDIA_PREVIOUS: return "MEDIA";
            case KeyEvent.KEYCODE_PAGE_UP: case KeyEvent.KEYCODE_PAGE_DOWN: case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_DPAD_DOWN: return "PAGE";
            default: return null;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (HwKeysPlugin.capturing) {
            String name = keyName(e.getKeyCode());
            if (name != null) {
                if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0 && bridge != null) {
                    PluginHandle h = bridge.getPlugin("HwKeys");
                    if (h != null) ((HwKeysPlugin) h.getInstance()).fire(name);
                }
                return true; // niente cambio di volume mentre la fotocamera è aperta
            }
        }
        return super.dispatchKeyEvent(e);
    }
}
`);

console.log('Android aggiornato: versionCode', versionCode, ks ? '(firmato)' : '(senza firma)');
