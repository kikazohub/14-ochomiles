# 🏔️ 14 Ochomiles · 14 Eight-Thousanders

> Escala las 14 montañas más altas del planeta. Una línea de código a la vez.
> _Climb the 14 highest mountains on Earth. One line of code at a time._

Un juego web donde cada ochomil es una expedición de **10 campamentos**. Para avanzar
tienes que sobrevivir al clima y **resolver retos de programación en Python** que se
validan en el servidor. Alcanza la cima de las 14 y conviértete en leyenda.

---

## ⛰️ La idea

La montaña decide. En cada jornada el cielo puede darte un respiro, obligarte a
programar o hacer que retrocedas:

| Clima | Probabilidad | Qué pasa |
|-------|:---:|----------|
| ☀️ Soleado | 15 % | Avanzas un campamento **sin escribir código** |
| ⛈️ Tormenta | 80 % | Resuelves el **reto de programación** del campamento para subir |
| 🌨️ Avalancha | 5 % | **Retrocedes un campamento** (nunca por debajo del campo base) |

Una tormenta queda *fijada* hasta que la resuelvas: el reto no se vuelve a sortear. Si
equipas el equipo adecuado, una **avalancha puede quedar anulada**.

Cada campamento `N` propone un reto de **tier N** (de 1 a 10, dificultad creciente). Hay
**6 retos por tier = 60 retos** y el que te toca se elige de forma determinista con un
hash FNV-1a de `seed:montaña:campamento`, así que cada expedición tiene su propia selección.

---

## 🎒 Progresión

- **Resolver un reto** te da `tier + 2` **herramientas tecnológicas** 🧰 y un **fun fact tecnológico** 💡.
- **Alcanzar una cima** te entrega el **equipo de alpinismo exclusivo** de esa montaña, que se
  equipa automáticamente en tu avatar.
- **Gastar herramientas** en la **Wiki** desbloquea 5 expedientes por montaña:
  Historia (8), Curiosidades (10), Alpinistas (12), Leyendas (14) y Rutas (16).
- **Equipo con efectos reales** sobre el juego:

  | Efecto | Qué hace |
  |--------|----------|
  | `hint1` / `hint2` | Revela pistas del reto |
  | `example` | Muestra un ejemplo resuelto extra |
  | `hidden_count` | Revela cuántos casos de prueba ocultos hay |
  | `avalanche_guard` | Anula las avalanchas mientras esté equipado |

- **Avatar SVG por capas**: 14 piezas de equipo de las montañas se dibujan encima de tu
  alpinista. Personaliza nombre y género cuando quieras.
- **Reset total**: borra cumbres, inventario, wiki y fun facts sin tocar tu cuenta.

---

## 🛠️ Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **better-sqlite3** (base de datos local en `data/ochomiles.db`)
- **bcryptjs** + sesión firmada con HMAC-SHA256
- **Python 3** como motor de evaluación de los retos, en un subproceso aislado

## ✅ Requisitos

- **Node.js 20+** (probado con Node 26)
- **Python 3** disponible como `python3` (probado con Python 3.14)

## 🚀 Puesta en marcha

```bash
npm install
npm run dev          # http://localhost:3000
```

Crea tu cuenta, elige montaña y empieza a escalar.

### Scripts

```bash
npm run dev            # servidor de desarrollo
npm run build          # build de producción
npm run start          # sirve el build
npm run lint           # ESLint
node scripts/validate-challenges.ts   # 60/60 retos contra su solución de referencia
```

> El validador es la red de seguridad del contenido: recorre todos los retos, ejecuta sus
> casos de prueba y comprueba que la solución de referencia pasa. Si tocas
> `data/challenges.ts`, vuelve a lanzarlo.

---

## 🐍 Cómo se validan los retos

Tu código nunca se evalúa con `eval` en Node. El flujo es:

1. El reto viaja al cliente **sin sus tests ni su solución** (solo enunciado, pistas
   desbloqueadas y plantilla).
2. Al enviar, el servidor escribe tu código junto a un **arnés de Python** y lanza
   `python3 -B -I -S` en un subproceso aislado.
3. Límites: `RLIMIT_AS` de 512 MB y `RLIMIT_CPU` de 3 s, además de un timeout de 8 s en Node.
4. El resultado se escribe en un JSON temporal (tu `stdout` se ignora) y se compara
   `obtenido == esperado` con un `eval` de literales y builtins vacíos.
5. Si algo falla, recibes **el primer caso que rompe**, con sus argumentos, lo esperado y
   lo obtenido — pero nunca los tests ocultos completos.

Errores posibles: `no_solution` (falta la función `solution`), `student_error`, `timeout`,
`crashed` y `bad_output`.

---

## 🗂️ Estructura

```
14-ochomiles/
├── data/                 # Contenido bilingüe (solo servidor)
│   ├── mountains.ts      # 14 montañas: intro, historia, curiosidades, alpinistas…
│   ├── challenges.ts     # 60 retos (6 por tier) con tests y solución de referencia
│   ├── gear.ts           # 14 piezas de equipo + secciones de wiki + efectos
│   ├── funFacts.ts       # 44 datos tecnológicos
│   ├── types.ts
│   └── ochomiles.db      # tu progreso (ignorado por git)
├── scripts/
│   └── validate-challenges.ts
├── src/
│   ├── app/              # rutas y páginas (/, /home, /mountain/[id], /wiki, /progress)
│   │   └── api/          # auth, me, avatar, language, game/*, wiki/*
│   ├── components/       # Avatar SVG, MountainSilhouette, Nav y vistas de cada página
│   └── lib/
│       ├── db.ts         # esquema SQLite
│       ├── auth.ts       # bcrypt + cookie firmada
│       ├── executor.ts   # sandbox de Python
│       ├── game.ts       # clima, retos, recompensas, wiki, reset
│       ├── dictionary.ts # textos ES/EN
│       └── i18n.tsx      # proveedor de idioma
├── public/
└── package.json
```

## 🌍 Bilingüe

Toda la interfaz **y todo el contenido** (montañas, retos, equipo y fun facts) existen en
**español e inglés**. El selector ES/EN está siempre en la barra superior y tu elección se
guarda en tu cuenta.

---

## 🔒 Notas de seguridad

- Las contraseñas se guardan con **bcrypt**; nunca en claro.
- La sesión es una cookie `HttpOnly` firmada con HMAC-SHA256 y un secreto local en `data/.secret`.
- `data/challenges.ts` contiene las soluciones de referencia y **jamás** se envía al cliente;
  las páginas solo exponen la versión pública del reto.
- El código del jugador se ejecuta en un subproceso con límites de memoria, CPU y tiempo.

---

## 🧗 Créditos

Hecho para aprender Python subiendo montañas que existen de verdad. Los datos de cada
ochomil (alturas, primeras ascensiones, rutas y leyendas) son reales; los retos, el equipo
y los fun facts son la excusa para practicar código.

> «No escalamos montañas para que el mundo nos vea, sino para ver el mundo.»
> — David McCullough

**Licencia:** úsalo, modifícalo y súbelo a tu manera. 🏔️
