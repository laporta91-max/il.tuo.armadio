# Il tuo armadio — Fase 1

App Android (Capacitor) con guardaroba digitale e prova sul manichino o sulla tua foto.
L'interfaccia è nel file unico `www/index.html` (il file viene generato da `src/` con `node tools/build.js`).

## Come ottenere l'APK (una volta sola)

1. Crea un repository **privato** su GitHub e carica tutti i file di questa cartella (anche `.github`).
2. Vai su **Settings → Secrets and variables → Actions → New repository secret** e crea due secret,
   copiando i valori dal file `chiave-firma-SEGRETA.txt`:
   - `KEYSTORE_PASSWORD`
   - `KEYSTORE_BASE64`
3. Vai su **Actions → Build APK → Run workflow** (oppure fai un push).
4. Dopo circa 5 minuti l'APK è in **Releases** (`IlTuoArmadio-1.0.N.apk`). Aprilo dal telefono e installalo.

Ogni push crea una nuova versione con `versionCode` più alto, firmata con la stessa chiave:
si installa sopra la precedente senza perdere i dati.

⚠️ Conserva `chiave-firma-SEGRETA.txt` in un posto sicuro e non caricarlo nel repository:
se lo perdi, le versioni future non si potranno installare sopra quella attuale.

## Modificare l'app
- Modifica i file in `src/` e poi esegui `node tools/build.js` per rigenerare `www/index.html`
  (il workflow lo fa comunque da solo a ogni build).

## Cosa c'è nella Fase 1
- Armadio: griglia, categorie, ricerca, dettaglio con statistiche, bucato, "Provalo", modifica, eliminazione con Annulla, capi di esempio nascondibili.
- Aggiungi capo: ricerca immagini Google (con ripiego su Bing), fotocamera nell'app, galleria; rimozione sfondo AI sul telefono (`@imgly/background-removal`) con ripiego semplice; colore rilevato.
- Outfit: manichino o foto, scorri per cambiare, tieni premuto per aggiungere uno strato, strati con X, percentuale di abbinamento, preferiti, "Da comprare per questo look".
- Abbina: proposte solo con i tuoi capi, scarta i colori che stonano e i capi nel bucato, filtro stile, partenza da un capo.
- Profilo: avatar (foto o manichino), misure con anteprima, preferiti per stile, calendario, meteo (Open-Meteo), statistiche, palette personale, valigia, bucato, backup JSON condivisibile.

## Prossime fasi
- Fase 2: sagoma guida con MediaPipe Pose, scatto automatico, vestiti deformati sul corpo (thin-plate spline).
- Fase 3: prova virtuale AI gratuita (Hugging Face), configurabile dal Profilo, con avviso privacy.
