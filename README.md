# SOFIX GAME (`sofix-game`)

Çok oyunculu (multiplayer) tarayıcı oyunlarını tek bir hafif sunucu çatısı altında barındıran modüler web oyun platformu.

## Klasör Yapısı

```text
sofix-game/
├── server.js                  # Merkezi HTTP & WebSocket Yönlendirici (Gateway)
├── portal/                    # Ana Oyun Portalı (Sofix Game Hub)
│   └── index.html
└── games/                     # Oyun Modülleri
    └── stickbrawl/            # 1. Oyun: StickBrawl Arena (2D Çöp Adam Platform Savaşı)
        ├── index.js           # Oyun sunucusu & 60Hz fizik motoru
        └── public/            # İstemci dosyaları (HTML5 Canvas)
```

## Yeni Bir Oyun Nasıl Eklenir?
1. `games/<yeni-oyun>/` klasörü oluşturun (`index.js` ve `public/`).
2. `server.js` içerisine statik rotayı (`/yeni-oyun`) ve WebSocket rotasını (`/ws/yeni-oyun`) ekleyin.
3. `portal/index.html` içerisine oyunun kartını ekleyin.

## Çalıştırma

### Yerel Geliştirme
```bash
npm install
npm start
```

### Docker (Hetzner Sunucu)
```bash
docker compose up -d --build
```
