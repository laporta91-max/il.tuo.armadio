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
console.log('Android aggiornato: versionCode', versionCode, ks ? '(firmato)' : '(senza firma)');
