# SOFIX GAME (`sofix-game`)

Çok oyunculu (multiplayer) tarayıcı oyunlarını tek bir hafif sunucu çatısı altında barındıran modüler web oyun platformu.

Canlı Adres: **https://sofix-game.fatihyumusak.com**

## Klasör Yapısı

```text
sofix-game/
├── server.js                  # Merkezi HTTP & WebSocket Yönlendirici (Gateway)
├── portal/                    # Ana Oyun Portalı (Sofix Game Hub)
│   └── index.html
└── games/                     # Oyun Modülleri
    ├── stickbrawl/            # 1. Oyun: StickBrawl Arena (2D Çöp Adam Platform Savaşı)
    │   ├── index.js           # Oyun sunucusu & 60Hz fizik motoru
    │   └── public/            # İstemci dosyaları (HTML5 Canvas)
    └── tron/                  # 2. Oyun: Tron: Neon Grid 3D (3D Işık Motoru Arenası)
        ├── index.js           # 3D rampa, iz ve çarpışma sunucusu
        └── public/            # İstemci dosyaları (Three.js WebGL)
```

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
