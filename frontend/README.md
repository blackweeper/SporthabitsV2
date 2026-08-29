# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Build web (PWA)

`npm run build:web` est la SEULE méthode officielle pour régénérer `dist/` :

```bash
npm run build:web
```

Ce script enchaîne trois étapes obligatoires :

1. `expo export -p web` — export statique.
2. `scripts/patch-web-build.js` — injecte les corrections PWA nécessaires (`viewport-fit=cover`, fond global `html/body`, `min-height: 100dvh` sur `html/body/#root`, manifest + meta Apple, enregistrement du service worker).
3. `scripts/verify-web-build.js` — vérifie que `dist/index.html` contient bien ces corrections et **échoue** sinon.

**Ne jamais lancer `npx expo export -p web` seul** pour produire un `dist/` destiné à être commité/déployé : l'étape 2 ne s'exécuterait pas, et le build réintroduirait silencieusement le bug de bande blanche déjà rencontré en production sur PWA plein écran iOS (aucune erreur d'export ne le signale — seul `verify-web-build.js`, via `npm run build:web`, le détecte).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
