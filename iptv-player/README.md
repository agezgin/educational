# TurkIPTV Player

Modern, hizli ve kullanici dostu IPTV player. Netflix kalitesinde koyu tema arayuz, Android TV ve Samsung Tizen destegi.

```
+-------------------------------------------------------------+
|  < Kategoriler |       TurkIPTV Player          | [S] [A]   |
+----------------+--------------------------------------------+
|                |                                             |
|  * Favoriler   |  +------------------------------------+    |
|                |  | CANLI   TRT 1 HD                    |    |
|  TV Tumu       |  |  +-------+  Su an: Ana Haber       |    |
|                |  |  | LOGO  |  20:00 - 21:00          |    |
|  Haber         |  |  +-------+  Sonra: Spor Bulteni    |    |
|                |  |  ============================ %75   |    |
|  Spor          |  +------------------------------------+    |
|                |                                             |
|  Sinema        |  +------------------------------------+    |
|                |  | ATV                                 |    |
|  Eglence       |  |  +-------+  Su an: Kurulus Osman   |    |
|                |  |  | LOGO  |  20:00 - 22:00          |    |
|  Cocuk         |  |  +-------+  Sonra: Ana Haber       |    |
|                |  +------------------------------------+    |
+----------------+---------------------------------------------+
|  <> Gezin   OK Izle   * Favori Ekle   <- Geri              |
+-------------------------------------------------------------+
```

---

## Ozellikler

### Canli TV
- M3U ve Xtream Codes playlist destegi
- Streaming M3U parser (satir satir parse, aninda gosterim)
- Kategori sidebar + virtualized kanal listesi
- Favori kanallar
- Numara ile kanal secimi
- Hizli kanal degistirme (preloading ile < 1.5 sn)

### Video Player
- Tam ekran OSD (On-Screen Display) overlay
- Ses izi secimi (AudioTrackPicker)
- Altyazi destegi (OpenSubtitles + SRT/VTT parser)
- Oynatma hizi kontrolu
- Aspect ratio secimi
- Seek bar (10 sn ileri/geri atlama)
- Intro atlama butonu (SkipIntro)
- Uyku zamanlayicisi
- Chromecast destegi
- PiP (Picture-in-Picture) modu

### EPG (Program Rehberi)
- Kablo TV tarzi grid gorunum
- Progressive yukleme (once gorunen kanallar)
- Cache destegi (gereksiz tekrar indirme yok)

### VOD (Film & Dizi)
- Netflix tarzi browse ekrani (hero banner, satir satirlar)
- TMDB entegrasyonu (otomatik poster, puan, ozet eslestirme)
- Platform bazli satirlar (Netflix, Disney+, TOD, BluTV...)
- Tur bazli satirlar (Aksiyon, Dram, Komedi...)
- Gun bazli satirlar (Cuma Aksami dizileri)
- Film/Dizi detay ekrani (fragman, oyuncular, benzer icerikler)
- Oyuncu/Yonetmen detay sayfasi

### Dizi Takip Sistemi
- "Takip Et" ile dizi ekleme
- Sezon/bolum bazli izleme takibi
- Otomatik ilerleme (izleyince sonraki bolume gec)
- Durum yonetimi (Izleniyor / Tamamlandi / Beklemede / Birakildi / Izlenecek)
- Kullanici puanlama (1-10)
- Izleme istatistikleri (streak, toplam saat, bu ay)
- Yeni bolum kontrolu
- Haftalik takvim
- Export/Import (yedekleme)

### Watchlist & Oneriler
- Izleme listesi (devam et, tamamlandi, birakildi)
- Izleme gecmisine dayali oneri motoru
- TasteMatch (begeni eslestirme)
- Icerik tekilleştirme (duplikat temizleme)

### Akilli Medya Tercihleri
- Tercih edilen ses dili otomatik secimi
- Tercih edilen altyazi dili otomatik secimi
- Icerik bazli override
- Secim gecmisi ogrenme

### Arama
- YouTube TV tarzi ekran klavyesi (D-Pad uyumlu)
- Her harf girisinde anlik sonuc
- Kategori filtresi (Canli / Film / Dizi)
- Arama gecmisi + populer oneriler
- Fuzzy matching (yaklasik eslestirme)

### Kumanda Navigasyonu
- D-Pad tam destek
- Focus yonetimi (mavi cerceve + glow efekt)
- CH+/CH- ile kanal degistirme
- Ses kontrol
- Renkli tus kisayollari

---

## Teknoloji

| Katman | Teknoloji |
|---|---|
| Framework | React Native 0.73 |
| Navigasyon | React Navigation 6 (Native Stack) |
| State | Zustand 4.5 |
| Video | react-native-video 6 |
| Gorseller | react-native-fast-image |
| Kalici Depolama | MMKV + AsyncStorage |
| Metadata | TMDB API |
| Dil | TypeScript 5.3 (strict) |
| Test | Jest 29 |
| Lint | ESLint 8 |

---

## Proje Yapisi

```
src/
├── App.tsx                     # Uygulama giris noktasi
├── navigation/
│   └── AppNavigator.tsx        # Ekran yonlendirme (12 ekran)
│
├── screens/                    # Ekranlar
│   ├── HomeScreen.tsx          # Ana ekran (kanal listesi)
│   ├── PlayerScreen.tsx        # Video oynatici
│   ├── EPGScreen.tsx           # Program rehberi
│   ├── SearchScreen.tsx        # Arama (ekran klavyesi)
│   ├── MoviesScreen.tsx        # Film listesi
│   ├── MovieDetailScreen.tsx   # Film detay
│   ├── SeriesScreen.tsx        # Dizi listesi
│   ├── SeriesDetailScreen.tsx  # Dizi detay
│   ├── MySeriesScreen.tsx      # Takip edilen diziler
│   ├── PersonScreen.tsx        # Oyuncu/Yonetmen
│   ├── PlaylistAddScreen.tsx   # Playlist ekleme
│   └── SettingsScreen.tsx      # Ayarlar
│
├── components/
│   ├── channel/                # Kanal listesi bilesenleri
│   │   ├── CategorySidebar.tsx
│   │   ├── ChannelItem.tsx
│   │   └── ChannelList.tsx
│   ├── player/                 # Player bilesenleri
│   │   ├── OSDOverlay.tsx
│   │   ├── AudioTrackPicker.tsx
│   │   ├── SubtitlePicker.tsx
│   │   ├── SubtitleOverlay.tsx
│   │   ├── AdvancedSeekBar.tsx
│   │   ├── VODControls.tsx
│   │   ├── SkipIntroButton.tsx
│   │   ├── SleepTimerOverlay.tsx
│   │   ├── SmartTrackSelector.tsx
│   │   ├── ChannelPreview.tsx
│   │   ├── BottomContentPanel.tsx
│   │   ├── AspectRatioPicker.tsx
│   │   └── PlaybackSpeedPicker.tsx
│   ├── epg/                    # EPG bilesenleri
│   │   └── EPGGrid.tsx
│   ├── vod/                    # VOD bilesenleri
│   │   ├── NetflixBrowse.tsx
│   │   └── TasteMatch.tsx
│   ├── home/                   # Ana ekran bilesenleri
│   │   └── ContinueWatchingCarousel.tsx
│   ├── series/                 # Dizi bilesenleri
│   │   └── SeriesTrackingWidget.tsx
│   ├── settings/               # Ayar bilesenleri
│   │   ├── SettingsSection.tsx
│   │   ├── SettingsItem.tsx
│   │   └── NetworkDiagnosticsPanel.tsx
│   └── common/                 # Ortak bilesenler
│       ├── FocusableItem.tsx
│       ├── AnimatedTransition.tsx
│       ├── Badge.tsx
│       ├── LiveBadge.tsx
│       ├── ProgressBar.tsx
│       ├── GradientOverlay.tsx
│       └── ImageLoader.tsx
│
├── core/
│   ├── parser/                 # Playlist parser
│   │   ├── m3uParser.ts        # Streaming M3U parser
│   │   └── xtreamParser.ts     # Xtream Codes API parser
│   ├── player/                 # Player altyapisi
│   │   ├── playerEngine.ts
│   │   ├── engines/
│   │   │   ├── playerAbstraction.ts
│   │   │   ├── exoPlayerConfig.ts
│   │   │   └── vlcPlayerConfig.ts
│   │   ├── chromecast/
│   │   │   └── chromecastManager.ts
│   │   └── pip/
│   │       └── pipManager.ts
│   ├── cache/                  # 3 katmanli cache
│   │   └── cacheManager.ts     # L1 RAM / L2 Disk / L3 Network
│   ├── epg/
│   │   └── epgParser.ts
│   ├── audio/
│   │   └── audioTrackManager.ts
│   └── subtitle/
│       ├── subtitleParser.ts   # SRT/VTT parser
│       └── openSubtitles.ts    # OpenSubtitles API
│
├── services/
│   ├── tmdb/                   # TMDB entegrasyonu
│   │   ├── tmdbApi.ts          # API istemcisi
│   │   └── tmdbMatcher.ts      # Icerik eslestirme
│   ├── recommendations/
│   │   └── recommendationEngine.ts
│   ├── seriesTracker/
│   │   └── seriesTrackerService.ts
│   └── catalogTransformer.ts   # IPTV -> Netflix satirlari
│
├── store/                      # Zustand state yonetimi
│   ├── channelStore.ts         # Kanallar, favoriler
│   ├── vodStore.ts             # Film/Dizi state
│   ├── playerStore.ts          # Player state
│   ├── settingsStore.ts        # Uygulama ayarlari
│   ├── watchlistStore.ts       # Izleme listesi
│   ├── seriesTrackingStore.ts  # Dizi takip
│   └── mediaPreferencesStore.ts # Ses/altyazi tercihleri
│
├── hooks/                      # Custom React hooks
│   ├── useTVRemote.ts          # D-Pad kumanda
│   ├── useQuickZapping.ts      # Hizli kanal degistirme
│   ├── useSleepTimer.ts        # Uyku zamanlayici
│   ├── useDebounce.ts
│   └── useNetworkDiagnostics.ts
│
├── theme/                      # Tasarim tokenlari
│   ├── colors.ts               # Renk paleti (koyu/acik/AMOLED)
│   ├── spacing.ts
│   └── typography.ts
│
├── i18n/                       # Coklu dil
│   └── translations.ts         # TR / EN / DE
│
├── types/                      # TypeScript tip tanimlari
│   ├── channel.ts
│   ├── epg.ts
│   ├── player.ts
│   ├── vod.ts
│   ├── settings.ts
│   └── navigation.ts
│
└── utils/
    └── contentDedup.ts         # Icerik tekilleştirme
```

---

## Performans

| Metrik | Rakipler | TurkIPTV |
|---|---|---|
| Uygulama acilis | 5-10 sn | < 2 sn |
| Kanal listesi yukleme | 3-8 sn | < 1 sn |
| Kanal degistirme | 2-5 sn | < 1.5 sn |
| EPG yukleme | 10-30 sn | < 3 sn |
| Ilk stream baslama | 3-8 sn | < 2 sn |
| Arama sonuclari | 2-5 sn | < 0.5 sn |
| Menu gecisleri | 0.5-2 sn | < 0.2 sn |
| Bellek kullanimi | 200-400 MB | < 100 MB |

### Nasil?

- **Cache-first**: Acilista cache'den yukle, arka planda guncelle
- **Virtualized lists**: Sadece ekranda gorunenleri render et
- **Streaming parser**: M3U'yu satir satir parse et, ilk kanallari aninda goster
- **Preloading**: Secili kanalin ustundeki/altindaki kanallari hazirla
- **Progressive EPG**: Once gorunen kanallarin EPG'si, geri kalan arka planda

---

## Tema

Koyu tema varsayilan. AMOLED siyah ve acik tema secenekleri mevcut.

```
Arka Plan:   #0D1117    Metin:     #F0F6FC
Kart:        #161B22    Ikincil:   #8B949E
Aktif:       #1C2333    Soluk:     #484F58

Vurgu Mavi:  #3B82F6    Tehlike:   #F85149
Vurgu Yesil: #10B981    Basari:    #3FB950
Vurgu Amber: #F59E0B
```

Vurgu rengi degistirilebilir: Mavi / Kirmizi / Yesil / Turuncu.

---

## Kurulum

```bash
# Bagimlikliklar
npm install

# Android
npm run android

# iOS
npm run ios

# Gelistirme sunucusu
npm start
```

## Komutlar

```bash
npm run android      # Android'de calistir
npm run ios          # iOS'te calistir
npm start            # Metro bundler baslat
npm test             # Jest testlerini calistir
npm run lint         # ESLint kontrolu
npm run typecheck    # TypeScript tip kontrolu
```

---

## Path Alias

TypeScript ve Babel'de tanimli kisayollar:

| Alias | Yol |
|---|---|
| `@/*` | `src/*` |
| `@components/*` | `src/components/*` |
| `@screens/*` | `src/screens/*` |
| `@store/*` | `src/store/*` |
| `@core/*` | `src/core/*` |
| `@hooks/*` | `src/hooks/*` |
| `@services/*` | `src/services/*` |
| `@theme/*` | `src/theme/*` |
| `@types/*` | `src/types/*` |
| `@utils/*` | `src/utils/*` |
| `@i18n/*` | `src/i18n/*` |

---

## Ekran Akisi

```
PlaylistAdd (ilk acilis) ─── Home ──┬── Player
                                     ├── Movies ── MovieDetail
                                     ├── SeriesList ── SeriesDetail
                                     ├── MySeries
                                     ├── EPG
                                     ├── Search
                                     ├── PersonDetail
                                     └── Settings
```

---

## Lisans

Bu proje egitim amaclidir.
