/**
 * Radio internet "Workout" — catalogue basé EXCLUSIVEMENT sur le tag
 * radio-browser.info `workout` (voir
 * https://www.radio-browser.info/search?order=clickcount&reverse=true&hidebroken=true&tagList=workout),
 * trié par `clickcount` décroissant (nombre d'écoutes déclarées à
 * l'annuaire — la mesure de "popularité" la plus proche disponible côté
 * API). L'ordre de déclaration ci-dessous EST l'ordre d'affichage par
 * défaut partout où ce tableau est consommé (aucun tri supplémentaire
 * n'est appliqué à l'affichage) — ne pas réordonner sans mettre à jour ce
 * commentaire.
 *
 * Ce tag ne contient que 30 stations au total dans l'annuaire (vérifié —
 * `limit=200` ne renvoie pas plus que `limit=30`). Chacune des 30 a été
 * testée manuellement (requête réelle sur `streamUrl`, confirmée `200`/
 * `206` + un `content-type` audio réel) ; celles qui échouaient ont été
 * exclues plutôt que proposées cassées :
 * - 3 stations (WorkoutTime USA / Workout Time / WorkoutTime) partagent en
 *   réalité le même flux zeno.fm/surfernetwork, qui exige un en-tête
 *   `Referer` pointant spécifiquement vers zeno.fm — impossible à usurper
 *   depuis un `<audio src>` de navigateur, confirmé par test direct (401
 *   avec ou sans `Referer` générique). Structurellement injouable ici.
 * - 9 stations ne renvoient qu'un fichier playlist (`.m3u`/`.pls`, voire
 *   `.m3u8` HLS) plutôt qu'un flux audio direct — un `<audio src>` ne sait
 *   pas décoder un texte de playlist. Les `.m3u`/`.pls` testés pointent en
 *   plus vers une URL signée à courte durée de vie (paramètre `skey`/`exp`)
 *   sans en-tête CORS (`Access-Control-Allow-Origin` absent, vérifié) —
 *   même une résolution à la volée depuis l'app échouerait pour les mêmes
 *   raisons que `fetch()` échouerait déjà côté navigateur. Les variantes
 *   `.m3u8` (HLS) demanderaient un vrai lecteur HLS (hors dépendances de ce
 *   projet), donc également exclues.
 *
 * Résultat : 18 stations réellement jouables sur les 30 du tag — moins que
 * les "~30" visées, mais c'est la population réelle de flux fonctionnels
 * pour ce tag précis, pas un choix arbitraire de curation.
 *
 * `stationuuid` est l'identifiant radio-browser.info correspondant
 * (vérifié contre l'annuaire réel), réutilisé par `radio-browser.ts` pour
 * rafraîchir le statut en ligne à l'usage sans jamais dépendre de l'annuaire
 * pour le flux de lecture lui-même — la lecture continue de fonctionner
 * même si l'API radio-browser.info est injoignable.
 *
 * Seul un sous-ensemble (voir `radio-preferences.ts`, coché par défaut =
 * les stations les plus populaires) apparaît réellement dans le menu radio
 * principal — ce catalogue complet n'est affiché que sur l'écran de gestion
 * (`app/radio-stations-settings.tsx`).
 */

export type RadioStation = {
  stationuuid: string;
  name: string;
  streamUrl: string;
  favicon: string | null;
  homepage: string | null;
  tags: string;
  country: string;
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    stationuuid: "962f863e-0601-11e8-ae97-52543be04c81",
    name: "Radios 100FM",
    streamUrl: "http://gb25.streamgates.net/radios-audio/100Workout/icecast.audio",
    favicon: "https://digital.100fm.co.il/logo192.png",
    homepage: "http://digital.100fm.co.il/#100fm",
    tags: "workout",
    country: "Israël",
  },
  {
    stationuuid: "2c6e2132-2f82-11e9-8f31-52543be04c81",
    name: "FFH Workout",
    streamUrl: "http://streams.ffh.de/ffhchannels/mp3/hqworkout.mp3",
    favicon: null,
    homepage: "https://webradio.ffh.de/workout",
    tags: "workout",
    country: "Allemagne",
  },
  {
    stationuuid: "9615dd74-0601-11e8-ae97-52543be04c81",
    name: "Antenne Bayern - Workout Hits",
    streamUrl: "http://mp3channels.webradio.antenne.de/workout-hits",
    favicon: "http://www.antenne.de/logos/antenne-bayern/apple-touch-icon.png",
    homepage: "http://www.antenne.de/programm/empfang/antenne-bayern-hoeren-internet",
    tags: "workout",
    country: "Allemagne",
  },
  {
    stationuuid: "877fb292-0e44-46a1-9673-5cac9ce60152",
    name: "WORKOUT by rautemusik",
    streamUrl: "https://workout-high.rautemusik.fm/?ref=radiobrowser",
    favicon: null,
    homepage: "https://www.rm.fm/workout",
    tags: "dance, hip hop, hits, training, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "98d0e6a9-4919-11e8-b1b0-52543be04c81",
    name: "Sunshine Live - Workout",
    streamUrl:
      "http://sunsl.streamabc.net/sunsl-workout-mp3-192-3330865?sABC=5nr16rqq%230%23q40266oo6p321s1695o82262nq851ppo%23Jroenqvb-Cynlre&amsparams=playerid:Webradio-Player;skey:1524723421",
    favicon: null,
    homepage: "http://www.sunshine-live.de/#",
    tags: "hot hits, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "68bc1cdd-bc57-4a7c-9381-bc5374ab0881",
    name: "Hotmix Sport Workout",
    streamUrl: "https://streaming.hotmixradio.com/hotmix-sport-plus-en-mp3?provider=radiobrowser",
    favicon: "https://cdn.hotmixradio.com/hotmix-sport_plus-en-mp3.jpg",
    homepage: "https://hotmixradio.com/",
    tags: "sport, workout",
    country: "France",
  },
  {
    stationuuid: "64a64fad-f583-4c5e-a725-68f84d90716d",
    name: "Mixadance FM Fitness",
    streamUrl: "https://stream.mixadance.fm/fitness",
    favicon: "http://www.mixadance.fm/apple-touch-icon.png",
    homepage: "http://www.mixadance.fm/",
    tags: "electronic, fitness, workout",
    country: "Russie",
  },
  {
    stationuuid: "e6eb9cb5-c206-4e78-9b5e-5d10084363a7",
    name: "COOLFM Sportoláshoz",
    streamUrl: "https://mediagw.e-tiger.net/stream/zc20",
    favicon: null,
    homepage: "https://coolfm.hu/radio/digitalis-radiok/",
    tags: "fitness music, running, workout",
    country: "Hongrie",
  },
  {
    stationuuid: "5700b31a-e01e-4dc8-8b33-438d1d77366d",
    name: "FMV FIT Radio High Energy",
    streamUrl: "https://radio.webicdp.com/listen/fmvfitradiohighenergy/radio.mp3",
    favicon: "https://fmvfitradio.webicdp.com/favicon.png",
    homepage: "https://fmvfitradio.webicdp.com/",
    tags: "cardio, fitness, gym, motivation, training, workout",
    country: "Roumanie",
  },
  {
    stationuuid: "29c0dffe-f333-45f2-b5cb-fdcfd9d92093",
    name: "Radio ROKS (Moldova) - Workout",
    streamUrl: "https://radio6.dixi.md/listen/workout_rock/workout.aac",
    favicon: "https://radioroks.md/front-assets/favicons/favicon-96x96.png",
    homepage: "https://radioroks.md/",
    tags: "rock, workout",
    country: "Moldavie",
  },
  {
    stationuuid: "9642530a-0601-11e8-ae97-52543be04c81",
    name: "1A Fitness Hits",
    streamUrl: "http://stream.1a-webradio.de/saw-fitness/mp3-128/radio-browser-1a/stream.mp3",
    favicon: null,
    homepage: "http://www.1a-webradio.de/",
    tags: "dance, sport, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "559f27cb-371f-11e8-bb9b-52543be04c81",
    name: "RPR1. Workout",
    streamUrl: "http://streams.rpr1.de/rpr-fitfun-64-aac?usid=0-0-L-A-D-20",
    favicon: null,
    homepage: "https://www.rpr1.de/",
    tags: "dance, gym, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "96456555-0601-11e8-ae97-52543be04c81",
    name: "Radio SAW - Fitness",
    streamUrl: "http://stream.saw-musikwelt.de/saw-fitness/mp3-128/radio-browser/stream.mp3",
    favicon: null,
    homepage: "http://www.saw-musikwelt.de/",
    tags: "dance, fitness, sport, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "7087394d-ba03-11e9-acb2-52543be04c81",
    name: "Antenne Bayern Workout (AAC)",
    streamUrl: "http://mp3channels.webradio.antenne.de/workout-hits.aac",
    favicon: "https://www.antenne.de/logos/station-antenne-bayern/apple-touch-icon.png",
    homepage: "https://www.antenne.de/",
    tags: "workout",
    country: "Allemagne",
  },
  {
    stationuuid: "2d411ff6-99f8-4cf3-895f-2bbd3ee672ce",
    name: "Workout (Madmix)",
    streamUrl: "https://mml2.prostream.se/listen/workout/radio.mp3",
    favicon: "https://madmix.se/images/logo.jpg",
    homepage: "https://madmix.se/",
    tags: "edm, fitness, motivation, workout",
    country: "Suède",
  },
  {
    stationuuid: "cc411171-81e1-429b-84ad-9d58065647e5",
    name: "Gong FM Workout",
    streamUrl: "https://frontend.streamonkey.net/gongfm-workout/stream/aacp",
    favicon: "https://gongfm.s3-cdn.welocal.cloud/sources/5fb569ee0335d.svg",
    homepage: "https://www.gongfm.de/webchannels-2/",
    tags: "pop, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "5fc4222e-5816-11e8-b0ce-52543be04c81",
    name: "1A Fitness Hits (AAC)",
    streamUrl: "http://stream.1a-webradio.de/saw-fitness/aac-48/radiosure-1a/stream.mp3",
    favicon: null,
    homepage: "http://www.1a-webradio.de/",
    tags: "dance, sport, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "deac0e99-2625-4925-bec7-a817d2800048",
    name: "Flowstate House Radio",
    streamUrl: "https://radio.flowstateradio.net/listen/house/radio.mp3",
    favicon: "https://flowstateradio.net/assets/img/station/house-logo-128.png",
    homepage: "https://flowstateradio.net/",
    tags: "house, workout music",
    country: "Suisse",
  },
];
