# Rev Hunter — Versão Leve (PWA)

Cliente leve e moderno para os servidores do Rev Hunter, criado a partir da análise do APK original (`Rev_Hunter_47_xlux.apk`). Sem frameworks, sem SDKs de anúncios, sem telemetria — só HTML/CSS/JS puro.

## Por que não é o APK otimizado

O APK original foi compilado e protegido (LIAPP). Sem o código-fonte Android e sem Android SDK neste ambiente, não é possível recompilar um APK menor de forma confiável. Esta versão PWA é o caminho rápido: carrega em menos de 1 segundo, consome pouca memória/bateria e pode ser instalada na tela inicial do celular.

## Como rodar

```bash
cd app
npm start
# abre http://localhost:8080
```

Para usar no celular, sirva com HTTPS (ex.: Cloudflare Tunnel, ngrok ou qualquer hospedagem) e abra a URL — o navegador oferece "Adicionar à tela inicial".

## Configurar seus servidores

Duas formas:

1. **Pelo próprio app** (recomendado): use o cartão "Adicionar servidor" e preencha host, porta, protocolo e UUID/senha. Os servidores adicionados ficam salvos no navegador (`localStorage`) e podem ser removidos no `×`.
2. **Lista fixa**: edite `www/servers.json` com a lista extraída do APK (ou a sua própria):

```json
[
  {
    "name": "Brasil 1",
    "flag": "BR",
    "host": "seu-servidor.com",
    "port": 443,
    "protocol": "vless",
    "uuid": "seu-uuid",
    "security": "tls",
    "sni": "seu-servidor.com",
    "path": "/ws",
    "wsPath": "/ws"
  }
]
```

Campos: `name`, `flag` (código do país, 2 letras), `host`, `port`, `protocol` (`vless`, `vmess`, `trojan`, `ss`, `ssh`), `uuid`/`password`/`username`, `security`, `sni`, `path`, `wsPath` (endpoint WebSocket para teste de conexão).

## O que o app faz

- Lista os servidores com latência (teste best-effort).
- Testa a conexão via WebSocket (`wss://host:port/wsPath`).
- Exporta a configuração no formato `vless://...` (copia para a área de transferência) para importar em clientes como v2rayNG, Shadowrocket, etc.
- Adiciona e remove servidores pela interface, com persistência local.
- Funciona offline como PWA instalado (service worker com cache).

## Sobre a lista de servidores do APK

A análise completa está em [`docs/ANALISE_APK.md`](docs/ANALISE_APK.md). Resumo: o `assets/config/config.json` original está protegido em camadas (Base64 → Base91 customizado → container `TSH1` → PBKDF2 → cifra customizada → etapa nativa LIAPP → GZIP). Executamos o próprio código do APK até a chamada nativa, mas a última etapa roda em código ARM64 registrado via JNI, então a extração estática não foi possível neste ambiente.

Para popular o app com seus servidores, use uma das opções: exportar o JSON do painel (chave `Servers`), ler o cache do app em um aparelho onde ele já rodou (`SharedPreferences "RevHunterGERAL"`, chave `json`) ou adicionar manualmente na tela "Adicionar servidor".

## Limitações importantes

- Um navegador/PWA **não consegue criar um túnel VPN no Android** (isso exige app nativo com `VpnService`). Esta versão serve para **gerenciar, testar e exportar** as configurações e se comunicar com o servidor via WebSocket. Para túnel real no celular, é preciso de um app nativo leve (Flutter/Kotlin) — posso criar esse projeto depois, já com a lista de servidores extraída.

## Otimizações aplicadas em relação ao APK original

- Zero SDKs de anúncios/telemetria (AppLovin, Meta, Pangle, Sentry, APMInsight, Firebase, etc. removidos).
- Sem `geoip.dat`/`geosite.dat` embarcados (27 MB economizados).
- Sem `libgojni.so` de 30 MB embarcado.
- Sem wakelocks e serviços em segundo plano — o app só roda quando aberto.
- Cache estático via service worker; carrega offline após a primeira visita.
