# IPTV Player - Rakip Analizi & Performans + UI/UX Stratejisi

**Hedef:** Rakiplerden daha hizli, daha guzel, daha kullanici dostu bir IPTV player
**Tarih:** Subat 2026

---

## 1. Rakip Zayflik Analizi (Neden Kotuler?)

### 1.1 IPTV Smarters Pro - En Yaygin Sorunlar

| Sorun | Detay | Bizim Cozumumuz |
|---|---|---|
| **Yavas baslatma** | Uygulama acilisi 5-10 saniye, splash screen'de takilma | Cold start < 2 saniye hedefi |
| **Kanal listesi yavas yuklenme** | 1000+ kanal varsa liste render'i cok yavas | Virtualized list (sadece gorunen render edilir) |
| **Buffering / donma** | Zayif player optimizasyonu | Adaptive bitrate + buffer preloading |
| **Karmasik menuler** | 5-6 adimda kanal acma | Maksimum 2 tiklama ile kanal izleme |
| **Eski/cirkin arayuz** | 2018 tarzi UI, kucuk fontlar | Modern, Netflix-tier koyu tema |
| **Crash** | Ozellikle Android TV'de sik crash | Hata yonetimi, graceful degradation |
| **EPG yavas** | EPG yuklemesi 30+ saniye | Arka planda async EPG, progressive loading |
| **Reklam bombardimani** | Ucretsiz surumde asiri reklam | Minimal, non-intrusive reklam |

### 1.2 Smart IPTV (SIPTV) - Sorunlar

| Sorun | Detay |
|---|---|
| Antika arayuz | Basit liste, gorsel yok |
| Kumanda navigasyonu zor | Focus yonetimi kotu |
| Logo/ikon destegi zayif | Kanallar sadece metin |
| Guncelleme yok | Yillardir ayni |

### 1.3 TiviMate - Altin Standart (Referans Model)

TiviMate neden en iyi? Cunku:

- Grid tabanli EPG (kablo TV gibi)
- Hizli kanal degistirme (zapping < 1sn)
- Ozellestirilebilir tema/renkler
- Kumanda ile mukemmel navigasyon
- Temiz, modern arayuz
- Multi-playlist destegi

**AMA TiviMate'in zayifligi:** Sadece Android! Samsung Tizen yok. Iste bizim firsatimiz.

---

## 2. Performans Stratejisi - "Saniyelerin Onemi"

### 2.1 Hiz Hedefleri

```
+------------------------------------+-----------+-----------+
| Metrik                             | Rakipler  | Biz       |
+------------------------------------+-----------+-----------+
| Uygulama acilis suresi             | 5-10 sn   | < 2 sn    |
| Kanal listesi yukleme              | 3-8 sn    | < 1 sn    |
| Kanal degistirme (zapping)         | 2-5 sn    | < 1.5 sn  |
| EPG yukleme                        | 10-30 sn  | < 3 sn    |
| Ilk stream baslama                 | 3-8 sn    | < 2 sn    |
| Arama sonuclari                    | 2-5 sn    | < 0.5 sn  |
| Menu gecisleri                     | 0.5-2 sn  | < 0.2 sn  |
| Bellek kullanimi                   | 200-400MB | < 100MB   |
+------------------------------------+-----------+-----------+
```

### 2.2 Performans Teknikleri

#### A) Uygulama Baslatma Hizi

```
Rakipler:
  App Start -> Splash -> Login Check -> API Call -> Parse -> Render -> Ready
  ################################################ 8 sn

Biz:
  App Start -> Cached Data Render -> Background Sync -> Updated
  ################ 2 sn
```

**Teknikler:**

- Ilk acilista son kullanilan playlist'i cache'den yukle
- Splash screen yok, direkt iceriye gec
- Lazy initialization: sadece gereken moduller yuklensin
- Background'da guncel veriyi cek, UI'i sessizce guncelle

#### B) Kanal Listesi - Virtualized Rendering

```javascript
// KOTU: Tum kanallari render et (IPTV Smarters yaklasimi)
channels.map(ch => <ChannelItem {...ch} />) // 1000 DOM node = YAVAS

// IYI: Sadece ekranda gorunenleri render et
<FlatList
  data={channels}
  renderItem={renderChannel}
  windowSize={5}           // Sadece 5 sayfa oncesi/sonrasi
  maxToRenderPerBatch={10} // Her batch'te max 10 oge
  initialNumToRender={15}  // Ilk render 15 kanal
  removeClippedSubviews    // Gorunmeyen DOM'lari kaldir
  getItemLayout={...}      // Sabit yukseklik = scroll hesaplama instant
/>
```

#### C) Hizli Kanal Degistirme (Zapping)

```
Rakipler:
  Kanal Sec -> Stop Current -> Connect -> Buffer -> Play
  ################################ 4 sn

Biz:
  Kanal Sec -> Preloaded Buffer -> Instant Switch
  ############ 1.2 sn
```

**Teknikler:**

- **Preloading:** Secili kanalin ustundeki ve altindaki 2 kanali arka planda hazirla
- **Fast channel switch:** Mevcut stream'i kesme, yeni stream hazir olunca gec
- **Thumbnail preview:** Gecis sirasinda son frame'i goster (siyah ekran yok)
- **Adaptive buffer:** Ilk 2 saniyeyi dusuk kalite -> sonra HD'ye gec

#### D) EPG Performansi

```
Rakipler:
  EPG Request -> Download All -> Parse All -> Render All
  ######################################## 15-30 sn

Biz:
  Show Cached EPG -> Fetch Visible Channels -> Update Progressive
  ############ 2 sn (gorunen) + arka plan guncelleme
```

**Teknikler:**

- EPG verisini SQLite/AsyncStorage'da cache'le
- Sadece gorunen kanallarin EPG'sini once yukle
- Geri kalanini arka planda progressive yukle
- Son guncelleme zamanini kontrol et, gereksiz indirme yapma

#### E) Bellek Yonetimi

- Gorunmeyen kanal logolarini bellege yukleme
- Image cache limiti koy (max 50 logo bellekte)
- Buyuk playlist'leri chunk'lara bol
- WeakRef kullanarak garbage collection'a yardim et

---

## 3. UI/UX Tasarim Stratejisi - "TiviMate Kalitesi, Her Platformda"

### 3.1 Tasarim Ilkeleri

```
1. 2 TIKLA KURALI: Her islem max 2 tiklamada tamamlanmali
2. 3 METRE KURALI: Her oge 3 metreden okunabilir olmali
3. ANINDA TEPKI: Her etkilesim < 200ms yanit vermeli
4. SIFIR OGRENME: Ilk kullanimda bile anlayabilecek kadar basit
5. GOZ DOSTU: Koyu tema, dusuk parlaklik vurgulari
```

### 3.2 Renk Paleti

```
Arka Plan (Ana):      #0D1117  (Derin lacivert-siyah)
Arka Plan (Kart):     #161B22  (Koyu gri-mavi)
Arka Plan (Aktif):    #1C2333  (Secili oge arka plani)

Vurgu (Primary):      #3B82F6  (Canli mavi - focus ring)
Vurgu (Secondary):    #10B981  (Yesil - canli yayin gostergesi)
Vurgu (Accent):       #F59E0B  (Amber - favoriler yildiz)

Metin (Primary):      #F0F6FC  (Beyaz - basliklar)
Metin (Secondary):    #8B949E  (Gri - aciklamalar)
Metin (Muted):        #484F58  (Koyu gri - zaman bilgisi)

Tehlike:              #F85149  (Kirmizi - hata/uyari)
Basari:               #3FB950  (Yesil - bagli/aktif)
```

### 3.3 Ekran Akisi

```
+-------------------------------------------------------------+
|                    UYGULAMA AKISI                            |
|                                                              |
|  +----------+     +----------+     +------------------+      |
|  | Hosgeldin | --> | Playlist | --> |  Ana Ekran       |      |
|  | (sadece   |     | Ekle     |     |  (Kanal Listesi) |      |
|  | ilk kez)  |     | (M3U/API)|     |                  |      |
|  +----------+     +----------+     +--------+---------+      |
|                                              |               |
|                   +--------------------------+               |
|                   v                          v               |
|           +--------------+         +--------------+          |
|           |  Player      |         |  Ayarlar     |          |
|           |  (Tam Ekran) |         |              |          |
|           |  + OSD       |         |              |          |
|           +--------------+         +--------------+          |
+-------------------------------------------------------------+
```

### 3.4 Ana Ekran Tasarimi (Kanal Listesi)

```
+-------------------------------------------------------------+
| < Kategoriler |          TurkIPTV Player          | [S] [A]  |
+---------------+---------------------------------------------+
|               |                                              |
|  * Favoriler  |  +-------------------------------------+    |
|               |  | CANLI   TRT 1 HD                     |    |
|  TV Tumu      |  |                                      |    |
|               |  |  +---------+  Su an: Ana Haber       |    |
|  Haber        |  |  |  LOGO   |  20:00 - 21:00         |    |
|               |  |  |  TRT 1  |  Sonra: Spor Bulteni   |    |
|  Spor         |  |  |         |                         |    |
|               |  |  +---------+                         |    |
|  Sinema       |  |  =============================== %75 |    |
|               |  +-------------------------------------+    |
|  Eglence      |                                              |
|               |  +-------------------------------------+    |
|  Cocuk        |  |    ATV                               |    |
|               |  |  +---------+  Su an: Kurulus Osman   |    |
|  Muzik        |  |  |  LOGO   |  20:00 - 22:00         |    |
|               |  |  |  ATV    |  Sonra: Ana Haber       |    |
|  Uluslar.     |  |  +---------+                         |    |
|               |  +-------------------------------------+    |
|               |                                              |
|               |  +-------------------------------------+    |
|               |  |    Show TV                           |    |
|               |  |  +---------+  Su an: Cok Guzel...    |    |
|               |  |  |  LOGO   |  20:00 - 23:00         |    |
|               |  |  | Show TV |  Sonra: Gecenin Sonu    |    |
|               |  |  +---------+                         |    |
|               |  +-------------------------------------+    |
|               |                                              |
+---------------+----------------------------------------------+
|  <> Gezin   OK Izle   * Favori Ekle   <- Geri              |
+-------------------------------------------------------------+
```

### 3.5 Player Ekrani (OSD - On Screen Display)

```
+-------------------------------------------------------------+
|                                                              |
|                     +===============+                        |
|                     |               |                        |
|                     |  VIDEO STREAM |                        |
|                     |  (Tam Ekran)  |                        |
|                     |               |                        |
|                     +===============+                        |
|                                                              |
|  +-----------------------------------------------------+    |
|  | ^ CH+                                                |    |
|  |                                                      |    |
|  |  +-------+  TRT 1 HD                    20:00       |    |
|  |  | LOGO  |  Ana Haber Bulteni                       |    |
|  |  | TRT 1 |  ================--------- %65           |    |
|  |  +-------+  Sonra: Spor Bulteni (21:00)             |    |
|  |                                                      |    |
|  | v CH-                                     Vol 85%    |    |
|  +-----------------------------------------------------+    |
|                                                              |
|  <> Kanal   Vol Ses   i Bilgi   * Favori   <- Geri         |
+-------------------------------------------------------------+

OSD Davranisi:
- OK tusuna basinca OSD acilir
- 5 saniye hareketsizlik -> OSD otomatik kapanir
- Yukari/Asagi -> Kanal degistir (OSD kapaliyken de calisir)
- Sol/Sag -> Ses kontrol
```

### 3.6 EPG (Program Rehberi) Ekrani

```
+-------------------------------------------------------------+
|              Program Rehberi                    < Bugun >    |
+----------+----------+----------+----------+-----------------+
| Kanal    |  19:00   |  20:00   |  21:00   |  22:00          |
+----------+----------+----------+----------+-----------------+
|          |          |          |          |                  |
| TRT 1 HD | Seksenler|=Ana=====|Spor Bul. | Belgesel         |
|          |          |==Haber===|          |                  |
+----------+----------+----------+----------+-----------------+
|          |          |          |                              |
| ATV      | Arka Sok.|==== Kurulus Osman ====| Ana Haber      |
|          |          |          |                              |
+----------+----------+----------+----------+-----------------+
|          |          |          |                              |
| Show TV  | Her Sey  |==== Cok Guzel Hareketler ============ |
|          |          |          |                              |
+----------+----------+----------+----------+-----------------+
|          |          |          |          |                  |
| Kanal D  | Arka Sok.| Oyle Bir | Son Yaz  | Haber           |
|          |          | Gecer Za.|          |                  |
+----------+----------+----------+----------+-----------------+
|  <> Gezin   OK Izle   [K] Bugun   [Y] Yarin   <- Geri     |
+-------------------------------------------------------------+
```

### 3.7 Ayarlar Ekrani

```
+-------------------------------------------------------------+
|  [S] Ayarlar                                                |
+-------------------------------------------------------------+
|                                                              |
|  [>] Playlist Yonetimi                                      |
|     +-- Playlist Ekle (M3U URL)                             |
|     +-- Playlist Ekle (Xtream Codes)                        |
|     +-- Playlistlerim                                       |
|     +-- EPG Kaynagi Ayarla                                  |
|                                                              |
|  [>] Gorunum                                                |
|     +-- Tema: Koyu / Acik / AMOLED Siyah                   |
|     +-- Vurgu Rengi: Mavi / Kirmizi / Yesil / Turuncu      |
|     +-- Font Boyutu: Normal / Buyuk                         |
|     +-- Kanal Listesi Stili: Liste / Grid                   |
|                                                              |
|  [>] Oynatma                                                |
|     +-- Varsayilan Kalite: Otomatik / 1080p / 720p / 480p  |
|     +-- Buffer Suresi: 2sn / 5sn / 10sn                    |
|     +-- Hardware Decoding: Acik / Kapali                    |
|     +-- OSD Sure: 3sn / 5sn / 10sn                         |
|                                                              |
|  [>] Ebeveyn Kontrolu                                       |
|     +-- PIN Ayarla                                          |
|     +-- Kilitli Kategoriler                                 |
|                                                              |
|  [>] Dil: Turkce / English / Deutsch                        |
|                                                              |
|  [>] Hakkinda                                               |
|     +-- Surum: 1.0.0                                        |
|     +-- Guncelleme Kontrol                                  |
|     +-- Geri Bildirim Gonder                                |
|                                                              |
+-------------------------------------------------------------+
|  ^v Gezin   OK Sec   <- Geri                                |
+-------------------------------------------------------------+
```

---

## 4. Kumanda Navigasyonu (Kritik UX Detayi)

### 4.1 D-Pad Mapping

```
TV Kumanda Tuslari:

  +---------------------+
  |                     |
  |    [^] Yukari       |  -> Listede yukari / Kanal +
  |  [<] [OK] [>]      |  -> Gezin / Sec / Ses kontrol
  |    [v] Asagi        |  -> Listede asagi / Kanal -
  |                     |
  |  [<-] Geri          |  -> Onceki ekran / OSD kapat
  |  [H] Ana Sayfa      |  -> Ana menuye don
  |                     |
  |  [CH+] [CH-]        |  -> Kanal degistir (her zaman)
  |  [V+] [V-]          |  -> Ses kontrol (her zaman)
  |  [0-9] Numaralar    |  -> Direkt kanal numarasi gir
  |                     |
  |  [K] [Y] [S] [M]   |  -> Renkli tuslar (kisayol)
  |  K = EPG                                          |
  |  Y = Favoriler                                    |
  |  S = Ses/Altyazi                                  |
  |  M = Bilgi                                        |
  +---------------------+
```

### 4.2 Focus Yonetimi Kurallari

```
1. Focus HER ZAMAN gorunur olmali (mavi cerceve + hafif buyutme)
2. Focus sirasini mantikli tut (soldan saga, yukaridan asagiya)
3. Focus kaybolmamali (ekran kenarinda wrap etme, dur)
4. Son focus'u hatirla (geri gelince ayni yerde basla)
5. Animasyonlar 150ms max (hizli hissettirsin)
```

### 4.3 Focus Animasyonu

```css
/* Secili oge */
.channel-item:focus {
  transform: scale(1.05);           /* Hafif buyutme */
  border: 2px solid #3B82F6;        /* Mavi cerceve */
  background: #1C2333;              /* Koyu arka plan */
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); /* Glow efekt */
  transition: all 0.15s ease-out;   /* Hizli ama yumusak */
}

/* Secili olmayan oge */
.channel-item {
  transform: scale(1.0);
  border: 2px solid transparent;
  background: #161B22;
  transition: all 0.15s ease-out;
}
```

---

## 5. Teknik Performans Optimizasyonlari

### 5.1 M3U Parser - Streaming Parser

```
Rakipler: Tum M3U dosyasini indir -> Parse et -> Goster
Sorun: 10.000 kanallik M3U = 5-10 MB = 5-10 saniye bekleme

Biz: Satir satir stream ederek parse et -> Ilk 20 kanali aninda goster
```

```javascript
// Streaming M3U Parser konsepti
async function* parseM3UStream(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentChannel = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Son eksik satiri sakla

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        currentChannel = parseExtInf(line);
      } else if (line.trim() && currentChannel) {
        currentChannel.url = line.trim();
        yield currentChannel; // Her kanal hazir olunca hemen ver
        currentChannel = null;
      }
    }
  }
}

// Kullanim: Ilk kanallar aninda ekranda
for await (const channel of parseM3UStream(url)) {
  addToList(channel); // Her kanal geldiginde listeye ekle
}
```

### 5.2 Akilli Onbellekleme

```
+---------------------------------------------+
|           Onbellek Katmanlari               |
+---------------------------------------------+
|                                              |
|  L1: Bellek (RAM)                            |
|  +-- Son 50 kanal logosu                     |
|  +-- Aktif kategori kanal listesi            |
|  +-- Mevcut + komsu kanal stream bilgisi     |
|                                              |
|  L2: Yerel Depolama (AsyncStorage/SQLite)    |
|  +-- Tum kanal listesi (M3U parsed)          |
|  +-- EPG verisi (son 24 saat)                |
|  +-- Favori kanallar                         |
|  +-- Son izleme gecmisi                      |
|  +-- Kullanici ayarlari                      |
|                                              |
|  L3: Ag (Lazy Fetch)                         |
|  +-- Guncel M3U playlist                     |
|  +-- Guncel EPG                              |
|  +-- Kanal logolari (ilk kez)                |
|                                              |
|  Strateji:                                   |
|  1. L1'den goster (aninda)                   |
|  2. L2'den kontrol et (< 100ms)             |
|  3. L3'ten guncelle (arka plan)              |
|  4. Degisiklik varsa UI'i sessizce guncelle  |
+---------------------------------------------+
```

### 5.3 Video Player Optimizasyonu

**Android TV (ExoPlayer):**

```
- Hardware decoding: Varsayilan olarak acik
- Buffer stratejisi:
  * Min buffer: 2 saniye (hizli baslatma)
  * Max buffer: 15 saniye (kararli oynatma)
  * Buffer for playback: 1 saniye (1 sn sonra oynat)
- Adaptive bitrate: Bant genisligine gore otomatik kalite
- Fast channel switch: ExoPlayer.setMediaSource() yerine
  ExoPlayer.seekToDefaultPosition() kullanarak
  player'i yeniden olusturmadan kanal degistir
```

**Samsung Tizen (AVPlay):**

```
- AVPlay.open() -> AVPlay.prepareAsync() -> AVPlay.play()
- Buffer boyutunu minimize et (INITIAL_BUFFER_SIZE: 2sn)
- Kanal degistirmede AVPlay.stop() -> AVPlay.open(newUrl) ->
  AVPlay.prepareAsync() -> AVPlay.play()
- DRM destegi: PlayReady (Tizen native)
```

---

## 6. Farkimiz - Neden Bizi Secsinler?

```
+----------------------------------------------------------+
|                    DEGER ONERMESI                          |
+----------------------------------------------------------+
|                                                           |
|  HIZLI                                                    |
|     "2 saniyede acilir, 1 saniyede kanal degistirir"     |
|                                                           |
|  GUZEL                                                    |
|     "Netflix kalitesinde modern, koyu tema arayuz"       |
|                                                           |
|  TURKCE                                                   |
|     "Ilk ve tek tam Turkce IPTV player"                  |
|                                                           |
|  CROSS-PLATFORM                                           |
|     "Samsung TV + Android TV + Turkcell kutusu"          |
|     (TiviMate bunu yapamiyor!)                           |
|                                                           |
|  AKILLI                                                   |
|     "En cok izledigin kanallari ogrenir, one cikarir"   |
|                                                           |
|  BASIT                                                    |
|     "2 tiklama ile izlemeye basla, gereksiz menu yok"    |
|                                                           |
+----------------------------------------------------------+
```

---

## 7. Rekabet Avantaji Ozet Tablosu

| Ozellik | Smarters | Smart IPTV | TiviMate | Biz |
|---|---|---|---|---|
| Samsung Tizen | Var | Var | YOK | VAR |
| Android TV | Var | YOK | Var | VAR |
| Turkce UI | YOK | YOK | YOK | VAR |
| Hizli acilis (<2sn) | YOK | YOK | Kismi | VAR |
| Modern UI | YOK | YOK | Var | VAR |
| Grid EPG | YOK | YOK | Var | VAR |
| Akilli oneri | YOK | YOK | YOK | VAR |
| Hizli zapping | YOK | YOK | Var | VAR |
| Reklamsiz (ucretsiz) | YOK | YOK | YOK | VAR* |
| Turkcell kutusu uyumu | Kismi | YOK | Kismi | VAR |

*Ilk surumde reklamsiz, kullanici tabani buyuyunce freemium

---

## 8. Sonraki Adim

Is plani ve stratejisi hazir. Simdi kodlamaya gecelim:

1. **React Native proje olustur** (Android TV hedefli)
2. **M3U Streaming Parser** yaz
3. **Kanal listesi UI** (virtualized, focus yonetimli)
4. **Video player entegrasyonu**
5. **Turkcell TV+ kutusunda ilk test**
