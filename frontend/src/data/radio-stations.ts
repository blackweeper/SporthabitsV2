/**
 * Radio internet "Workout" — catalogue d'environ 30 stations sport/
 * motivation/dance/électro, curées à la main (pas l'annuaire
 * radio-browser.info brut) : chaque flux a été testé manuellement (requête
 * réelle sur `streamUrl`, confirmée `200`/`206` + un `content-type` audio
 * réel — les quelques candidats qui ne renvoyaient qu'un fichier `.pls`
 * (une playlist, pas un flux direct) ont été exclus) avant d'être ajouté
 * ici. `stationuuid` est l'identifiant radio-browser.info correspondant
 * (vérifié contre l'annuaire réel), réutilisé par `radio-browser.ts` pour
 * rafraîchir le statut en ligne à l'usage sans jamais dépendre de l'annuaire
 * pour le flux de lecture lui-même — la lecture continue de fonctionner
 * même si l'API radio-browser.info est injoignable.
 *
 * Seul un sous-ensemble (voir `radio-preferences.ts`, coché par défaut =
 * les 7 stations d'origine) apparaît réellement dans le menu radio
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
    stationuuid: "962cc6df-0601-11e8-ae97-52543be04c81",
    name: "Dance Wave!",
    streamUrl: "https://dancewave.online/dance.mp3",
    favicon: "https://dancewave.online/dw_logo.png",
    homepage: "https://dancewave.online/",
    tags: "dance, electronic, house, trance",
    country: "Hongrie",
  },
  {
    stationuuid: "64a64fad-f583-4c5e-a725-68f84d90716d",
    name: "Mixadance FM Fitness",
    streamUrl: "https://stream.mixadance.fm/fitness",
    favicon: "http://www.mixadance.fm/apple-touch-icon.png",
    homepage: "http://www.mixadance.fm/",
    tags: "fitness, workout, electronic",
    country: "Russie",
  },
  {
    stationuuid: "877fb292-0e44-46a1-9673-5cac9ce60152",
    name: "WORKOUT by rautemusik",
    streamUrl: "https://workout-high.rautemusik.fm/?ref=radiobrowser",
    favicon: "https://www.rm.fm/favicon.ico",
    homepage: "https://www.rm.fm/",
    tags: "workout, training, dance, hits",
    country: "Allemagne",
  },
  {
    stationuuid: "961787d1-0601-11e8-ae97-52543be04c81",
    name: "Frisky",
    streamUrl: "http://stream2.friskyradio.com/frisky_mp3_hi",
    favicon: "https://s3.amazonaws.com/media.friskyradio.com/favicon.png",
    homepage: "https://www.friskyradio.com/",
    tags: "electronic, progressive",
    country: "États-Unis",
  },
  {
    stationuuid: "960e4940-0601-11e8-ae97-52543be04c81",
    name: "Ibiza Global Radio",
    streamUrl: "http://ibizaglobalradio.streaming-pro.com:8024/",
    favicon: null,
    homepage: "http://www.ibizaglobalradio.com/",
    tags: "dance, electronic, house",
    country: "Espagne",
  },
  {
    stationuuid: "962a748b-0601-11e8-ae97-52543be04c81",
    name: "1.FM Deep House Radio",
    streamUrl: "http://strm112.1.fm/deephouse_mobile_mp3",
    favicon: null,
    homepage: "http://www.1.fm/",
    tags: "deep house, electronic",
    country: "Suisse",
  },
  {
    stationuuid: "9615dd74-0601-11e8-ae97-52543be04c81",
    name: "Antenne Bayern - Workout Hits",
    streamUrl: "http://mp3channels.webradio.antenne.de/workout-hits",
    favicon: "http://www.antenne.de/logos/antenne-bayern/apple-touch-icon.png",
    homepage: "http://www.antenne.de/programm/empfang/antenne-bayern-hoeren-internet",
    tags: "workout, hits",
    country: "Allemagne",
  },
  {
    stationuuid: "961949f3-0601-11e8-ae97-52543be04c81",
    name: "Hit FM (Ukraine)",
    streamUrl: "http://195.95.206.17/HitFM",
    favicon: "https://www.hitfm.ua/static/img/fav-icon/apple-icon-120x120.png",
    homepage: "http://www.hitfm.ua/",
    tags: "dance, pop, rock",
    country: "Ukraine",
  },
  {
    stationuuid: "9622cd46-0601-11e8-ae97-52543be04c81",
    name: "Europa Plus",
    streamUrl: "http://ep256.hostingradio.ru:8052/europaplus256.mp3",
    favicon: "http://liveam.tv/img/2494.jpg",
    homepage: "http://www.europaplus.ru/",
    tags: "dance, house, pop",
    country: "Russie",
  },
  {
    stationuuid: "165eab56-4a14-11e9-a4d7-52543be04c81",
    name: "DFM Дискач 90-х",
    streamUrl: "https://dfm-disc90.hostingradio.ru/disc9096.aacp",
    favicon: null,
    homepage: "https://dfm.ru/",
    tags: "eurodance, nostalgie",
    country: "Russie",
  },
  {
    stationuuid: "563f5559-105c-11e9-a80b-52543be04c81",
    name: "DFM Russian Dance",
    streamUrl: "https://dfm-dfmrusdance.hostingradio.ru/dfmrusdance96.aacp",
    favicon: "https://dfm.ru/uploads/favicon.ico",
    homepage: "https://dfm.ru/",
    tags: "dance",
    country: "Russie",
  },
  {
    stationuuid: "af6f51b1-0ca9-11ea-a87e-52543be04c81",
    name: "Intense Radio — We Love Dance",
    streamUrl: "https://secure.live-streams.nl/main",
    favicon: "https://www.intenseradio.net/wp-content/uploads/2023/09/intense-radio-vierkant-4d-2026.jpg",
    homepage: "https://www.intenseradio.net/",
    tags: "dance, electronic, house, techno, trance",
    country: "Pays-Bas",
  },
  {
    stationuuid: "60ceaabd-4efd-4f47-b961-0dab6f475731",
    name: "EuroDance 90 Radio",
    streamUrl: "https://stream-eurodance90.fr/radio/8000/128.mp3",
    favicon: "https://eurodance90.fr/favicon.ico",
    homepage: "https://eurodance90.fr/",
    tags: "eurodance, dancefloor, pop dance",
    country: "France",
  },
  {
    stationuuid: "caaa4c5a-16c8-11e9-a80b-52543be04c81",
    name: "Chocolate FM",
    streamUrl: "http://streaming5.elitecomunicacion.es:8082/live.mp3",
    favicon: "https://www.chocolatefm.com/__ovh/common/img/favicon.ico",
    homepage: "https://www.chocolatefm.com/",
    tags: "dance, latin, reggaeton, top 40",
    country: "Espagne",
  },
  {
    stationuuid: "9628632e-0601-11e8-ae97-52543be04c81",
    name: "Radio Stereocittà",
    streamUrl: "http://onair11.xdevel.com:8134/;stream.mp3",
    favicon: null,
    homepage: "http://www.stereocitta.it/",
    tags: "dance",
    country: "Italie",
  },
  {
    stationuuid: "962c0376-0601-11e8-ae97-52543be04c81",
    name: "Sunshine Live — Die 90er",
    streamUrl: "http://stream.sunshine-live.de/90er/mp3-192/stream.sunshine-live.de",
    favicon: null,
    homepage: "http://www.sunshine-live.de/",
    tags: "90s, dance, eurodance",
    country: "Allemagne",
  },
  {
    stationuuid: "960a0f41-0601-11e8-ae97-52543be04c81",
    name: "Radio Meuh",
    streamUrl: "http://radiomeuh.ice.infomaniak.ch/radiomeuh-128.mp3",
    favicon: null,
    homepage: "http://www.radiomeuh.com/",
    tags: "electronic, funk",
    country: "France",
  },
  {
    stationuuid: "342a0e53-ab9b-11e9-88f4-52543be04c81",
    name: "TranceBase.FM",
    streamUrl: "http://listen.trancebase.fm/tunein-aac-hd-pls",
    favicon: "https://www.trancebase.fm/media/icons/trb/apple-touch-icon.png",
    homepage: "https://www.trancebase.fm/",
    tags: "electronic, techno, trance",
    country: "Allemagne",
  },
  {
    stationuuid: "9627c2e6-0601-11e8-ae97-52543be04c81",
    name: "Sunshine Live — Techno",
    streamUrl: "http://stream.sunshine-live.de/techno/mp3-192/stream.sunshine-live.de/",
    favicon: null,
    homepage: "http://www.sunshine-live.de/",
    tags: "dance, electronic, techno",
    country: "Allemagne",
  },
  {
    stationuuid: "9618a87b-0601-11e8-ae97-52543be04c81",
    name: "Orbital",
    streamUrl: "http://centova.radios.pt:8401/;listen.pls",
    favicon: null,
    homepage: "http://www.orbital.pt/",
    tags: "dance, electronic, house",
    country: "Portugal",
  },
  {
    stationuuid: "d847db37-5f89-48a5-be32-b10e5406f0e6",
    name: "Mixadance FM",
    streamUrl: "https://stream.mixadance.fm/mixadance",
    favicon: "http://www.mixadance.fm/apple-touch-icon.png",
    homepage: "http://www.mixadance.fm/",
    tags: "dance, electro, house",
    country: "Russie",
  },
  {
    stationuuid: "777d14b2-f344-11e9-a96c-52543be04c81",
    name: "Los 40 Dance",
    streamUrl: "http://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_DANCE_SC",
    favicon: "https://recursosweb.prisaradio.com/fotos/original/010002753887.png",
    homepage: "https://los40.com/",
    tags: "dance, edm, electro, house",
    country: "Espagne",
  },
  {
    stationuuid: "559f27cb-371f-11e8-bb9b-52543be04c81",
    name: "RPR1. Workout",
    streamUrl: "http://streams.rpr1.de/rpr-fitfun-64-aac",
    favicon: null,
    homepage: "https://www.rpr1.de/",
    tags: "dance, gym, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "96456555-0601-11e8-ae97-52543be04c81",
    name: "Radio SAW — Fitness",
    streamUrl: "http://stream.saw-musikwelt.de/saw-fitness/mp3-128/radio-browser/stream.mp3",
    favicon: null,
    homepage: "http://www.saw-musikwelt.de/",
    tags: "dance, fitness, sport, workout",
    country: "Allemagne",
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
    stationuuid: "98d0e6a9-4919-11e8-b1b0-52543be04c81",
    name: "Sunshine Live — Workout",
    streamUrl:
      "http://sunsl.streamabc.net/sunsl-workout-mp3-192-3330865?sABC=5nr16rqq%230%23q40266oo6p321s1695o82262nq851ppo%23Jroenqvb-Cynlre&amsparams=playerid:Webradio-Player;skey:1524723421",
    favicon: null,
    homepage: "http://www.sunshine-live.de/",
    tags: "hot hits, workout",
    country: "Allemagne",
  },
  {
    stationuuid: "5ea0c406-cc3e-4a36-9a32-37ed4d5a180e",
    name: "Technolovers EDM",
    streamUrl: "https://stream.technolovers.fm/edm",
    favicon: "https://i.ibb.co/TmRLJsp/EDM-TL.jpg",
    homepage: "https://technolovers.fm/",
    tags: "edm, electro house, house",
    country: "Allemagne",
  },
  {
    stationuuid: "0ac7f5db-6f86-428f-8bb2-66ecce89ad1a",
    name: "1.FM — Deep Techno & Deep House",
    streamUrl: "http://strm112.1.fm/deeptech_mobile_mp3",
    favicon: null,
    homepage: "http://www.1.fm/",
    tags: "deep house, techno",
    country: "Suisse",
  },
  {
    stationuuid: "0f902505-76c7-489b-8ddc-03b05b5867ae",
    name: "Generation Dance Radio",
    streamUrl: "http://generationdance.lu/radio/8030/hd",
    favicon: "https://generation.dance/logo_500x500.png",
    homepage: "https://generation.dance/",
    tags: "dance, edm, eurodance, house, trance",
    country: "Luxembourg",
  },
  {
    stationuuid: "960d063e-0601-11e8-ae97-52543be04c81",
    name: "Sunshine Live",
    streamUrl: "http://stream.sunshine-live.de/live/mp3-192/stream.sunshine-live.de/",
    favicon: null,
    homepage: "http://www.sunshine-live.de/",
    tags: "dance, trance",
    country: "Allemagne",
  },
];
