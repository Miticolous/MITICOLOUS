# Análise do APK `Rev_Hunter_47_xlux.apk`

Análise estática (nenhum código do APK foi executado em dispositivo). Ferramentas usadas: `unzip`, `strings`, jadx 1.5.1, baksmali 2.5.2, dex2jar 2.4 (JRE 17 portátil).

## Identificação

- Pacote: `com.hunter.net`
- Base: fork do UltraSSH (`com.kiritoprojects.ultrasshservice`), com Trilead SSH2, jsocks, BadVpn Tun2Socks e Xray-core (`libgojni.so`).
- Protocolo dos servidores: **VLESS** com `streamSettings` dinâmico (`$SERVER_ADDRESS`, `$SERVER_PORT`, `$USER_ID`, `$FLOW`, `$ENCRYPTION`), template em `assets/base_config.json`. Também há suporte a VMess, Trojan, Shadowsocks e SSH.
- Contatos no APK: `devrevhunter@gmail.com`, `https://t.me/RevHunter`, `https://revhuntervpn.com/privacy.html`.

## Peso do APK (75 MB comprimido / ~219 MB extraído)

| Item | Tamanho |
|---|---|
| `classes*.dex` (14 arquivos) | ~140 MB |
| `libgojni.so` (Xray-core) | 30,7 MB |
| `assets/geoip.dat` | 18,5 MB |
| `assets/geosite.dat` | 8,7 MB |
| SDKs de anúncios e telemetria | AppLovin, Meta Audience Network, Pangle/TikTok, Moloco, Fyber, PubMatic, MobileFuse, Verve, IronSource/Appodeal, Unity Ads, Chartboost, InMobi, Vungle, BidMachine, TaurusX, Bigo, Sentry, APMInsight, Firebase, Crashlytics |

Os SDKs de anúncios rodam em segundo plano e são a principal causa de consumo de memória e bateria.

## Proteção

- LIAPP (`com.liapp.y`, `assets/LIAPP.ini`): strings e classes nativas ofuscadas, verificação de integridade e anti-tamper (`assets/.fxdvefvw.dex`, `libfxdvefvw.so`).
- Uso de `MediaDrm`, `DebugProbesKt.bin` e checagens de permissões (anti-repack).

## Lista de servidores (`assets/config/config.json`)

Camadas encontradas:

1. O arquivo é Base64.
2. O resultado é texto no alfabeto Base91 **customizado** (`defpackage.kc3.a`, 90+ símbolos fora da ordem padrão).
3. Saída: container com magic `TSH1` + blocos little-endian (`ByteBuffer.getInt`).
4. Chave derivada com `PBKDF2WithHmacSHA1` (100 iterações), senha fixa embutida no APK (`com/hunter/net/activities/GoogleSignInActivity.k`).
5. Cifra customizada (KSA estilo RC4 em `a23.w`) e uma última etapa em código nativo: `com/hunter/net/a/dk.d(byte[])` (LIAPP, `arm64-v8a`).
6. GZIP + JSON, com chaves `Servers`, `DataApp`, `Appodeal`, `Admob`, `Interstitial`, `Rewarded`.

Executamos o próprio `sq1.W` do APK na JVM (dex2jar + stubs de `android.util.Base64`) e chegamos até a chamada nativa. A etapa `dk.d` é implementada em código nativo ARM64 registrado via `JNI_OnLoad`, portanto não é reproduzível de forma confiável neste ambiente. **A lista de servidores não pôde ser extraída estaticamente.**

Alternativa: a lista está disponível no painel do desenvolvedor (JSON com a chave `Servers`) ou no cache `SharedPreferences("RevHunterGERAL").getString("json")` de um aparelho onde o app já rodou.

## Recomendação

- Para um app realmente leve: cliente novo (PWA ou Flutter/Kotlin) usando VLESS via Xray-core, sem os SDKs de anúncios e sem `geoip/geosite` embarcados (carregar sob demanda).
- O `assets/base_config.json` é o template Xray e pode ser reaproveitado.
