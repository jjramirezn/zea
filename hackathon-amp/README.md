# 🌽 Zea — AMP Field Agent

**Diagnóstico de cultivos + recomendación de péptidos antimicrobianos vía WhatsApp.**

Mandá una foto de tu planta enferma por WhatsApp → Zea identifica el patógeno → te recomienda el péptido antimicrobiano (AMP) exacto para combatirlo.

> **Probalo ahora:** [+54 9 11 2261-1627](https://wa.me/5491122611627?text=Hola%2C%20quiero%20diagnosticar%20mi%20cultivo) · [Demo web](http://187.77.247.169:8080)

---

## ¿Por qué Zea?

Argentina gasta **USD 3.100M/año** en agroquímicos. Los patógenos desarrollan resistencia, los residuos contaminan, y el asesoramiento bioinformático no existe a escala. Los péptidos antimicrobianos (AMPs) atacan la membrana física del patógeno — más difícil de esquivar evolutivamente, biodegradables, y sintetizables localmente.

**El problema:** la ciencia de AMPs existe en papers y bases de datos. No llega al campo.

**Zea lo resuelve:** un agente de WhatsApp que cualquier agricultor puede usar. Sin app, sin cuenta, sin fricción.

---

## Cómo funciona

```
📸 Foto de planta enferma (WhatsApp)
         │
         ▼
┌─────────────────────────────────────┐
│  FASE 1 — DIAGNÓSTICO (IA)         │
│  Vision AI analiza síntomas         │
│  Output: JSON estructurado          │
│  Vocabulario cerrado: solo puede    │
│  identificar patógenos de nuestra   │
│  base de datos verificada           │
├─────────────────────────────────────┤
│  FASE 2 — SELECCIÓN AMP (código)   │
│  Lookup determinístico en DB        │
│  Sin IA. String match exacto.       │
│  Imposible alucinar un péptido.     │
├─────────────────────────────────────┤
│  FASE 3 — BIOSEGURIDAD (código)    │
│  Chequeo de alertas rojas           │
│  Aflatoxinas, cuarentenas, mezclas  │
│  prohibidas → BLOQUEA tratamiento   │
├─────────────────────────────────────┤
│  FASE 4 — RESPUESTA (IA)           │
│  Toma datos verificados y redacta   │
│  explicación clara para el          │
│  agricultor. No puede cambiar       │
│  los datos del pipeline.            │
└─────────────────────────────────────┘
         │
         ▼
💬 Recomendación por WhatsApp
```

---

## Cómo evitamos falsos positivos y negativos

El mayor riesgo de un agente de IA en agricultura es recomendar el tratamiento equivocado. Zea aborda esto con un **pipeline híbrido** donde la IA nunca toma decisiones críticas:

### 1. Vocabulario cerrado (anti-alucinación)
La IA de diagnóstico solo puede identificar patógenos que existen en nuestra base de datos curada. No puede inventar nombres ni matches. Si el patógeno no está en la DB → dice "no tengo recomendación", nunca adivina.

### 2. Selección determinística (sin IA)
La selección del péptido es código puro — un string match exacto contra la DB. No hay modelo de lenguaje involucrado. Si la DB dice que Botrytis → RsAFP2, eso es lo que devuelve. Siempre.

### 3. Niveles de confianza explícitos
Cada diagnóstico incluye un nivel de confianza (alto/medio/bajo) basado en criterios definidos:
- **Alto:** síntomas de manual para ese patógeno en ese cultivo
- **Medio:** síntomas consistentes pero podrían ser otro patógeno
- **Bajo:** incierto, se pide más información o se recomienda consultar un agrónomo

### 4. Bioseguridad como guardarraíl
Antes de cualquier recomendación, el sistema chequea alertas de bioseguridad:
- **Alerta roja** (aflatoxinas, ergotismo): bloquea tratamiento, indica destrucción del lote
- **Cuarentena** (HLB, Xylella): no recomienda AMPs, deriva a autoridades fitosanitarias
- **Bloqueo ético**: rechaza péptidos análogos a antibióticos de último recurso humano
- **Interacciones químicas**: advierte sobre mezclas peligrosas (cobre, tensioactivos)

### 5. Fuentes citadas
Cada recomendación incluye la fuente de la base de datos (APD3, DRAMP, DBAASP) y la concentración inhibitoria mínima (MIC) medida en estudios publicados. El usuario puede verificar.

### 6. El usuario conoce su cultivo
Si el agricultor dice "es tomate", el sistema le cree — no intenta sobreescribir con identificación visual. Reduce errores de clasificación de cultivo.

### 7. Disclaimer obligatorio
Toda recomendación termina con: *"Basado en estudios in vitro. Validar en campo antes de aplicar a escala."*

---

## Datos curados

| Archivo | Propósito |
|---------|-----------|
| `matcher_patogenos.json` | Patógeno → AMP con secuencia, MIC y fuente |
| `cerebro_ambiental.json` | Contexto ambiental: estrés de planta × patógeno × solución |
| `traductor_agentes.json` | Química del AMP explicada para técnicos y agricultores |
| `bioseguridad_y_alertasrojas.json` | Guardarraíles: toxicidad, cuarentenas, mezclas prohibidas |

---

## Pagos (x402)

Después de 10 diagnósticos gratuitos, el agente retorna HTTP 402 con headers x402:

```
HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.50
X-Payment-Currency: USDC
X-Payment-Required: true
```

El agricultor paga $0.50 USDC por diagnóstico. El mismo protocolo que el agente usa para pagar su propio cómputo.

---

## Stack

- **WhatsApp:** Canal principal — sin app, sin onboarding, sin fricción
- **OpenClaw:** Runtime del agente (gestión de sesiones, WhatsApp, herramientas)
- **Claude Sonnet 4:** Vision AI para diagnóstico + traducción de resultados
- **Pipeline determinístico:** Node.js puro para selección de AMP y bioseguridad
- **x402:** Protocolo de pago nativo por diagnóstico

---

## Estructura

```
zea/
├── agent/
│   ├── skill/SKILL.md              # Instrucciones del agente
│   └── data/
│       ├── matcher_patogenos.json   # Patógeno → AMP (lookup)
│       ├── cerebro_ambiental.json   # Contexto planta/clima/patógeno
│       ├── traductor_agentes.json   # Explicaciones técnicas + farmer
│       └── biosecurity-alerts.json  # Alertas rojas y guardarraíles
├── frontend/
│   ├── index.html                   # Landing + chat web
│   └── server.js                    # API con pipeline híbrido
└── x402/                            # Integración de pagos
```

---

## Equipo

Construido en **Aleph Hackathon 2026** 🇦🇷

## Licencia

MIT
