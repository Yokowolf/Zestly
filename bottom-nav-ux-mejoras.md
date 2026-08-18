# Bottom Navigation — auditoría UX y plan de mejoras

Basado en el video *"Top UI/UX Design Tips - How to Design a Great Bottom Mobile Navigation Bar"* (transcript completo en `transcript UIUX.md`), aplicado directo al nav real de Zestly: [`web/src/App.jsx`](web/src/App.jsx) líneas 127-142, componente `TABS` (6 pestañas: Inicio, Calorías, Entrena, Plan, Progreso, Coach).

## Resumen de los tips del video

1. **Prioriza lo esencial** — solo destinos core (home, búsqueda, crear, mensajes, perfil). Nunca ayuda, logout, legales, ni botones back/logo (eso es de top-nav). Un CTA central (crear/agregar) es válido y efectivo.
2. **Conoce a tu usuario** — si el público es menos tech-savvy, usa labels + iconos (no solo iconos).
3. **Tamaños** — icono ~24px, indicador home ~34px, label 10-12px. Prueba en 2-3 anchos de dispositivo.
4. **Respeta el safe area** — nunca taparlo ni superponerte al home indicator.
5. **Máximo de pestañas** — ideal 3-5, tope 6.
6. **Área táctil** — mínimo 44×44px por botón (regla del pulgar).
7. **Diferencia activo/inactivo con AL MENOS 2 cambios visuales** — no basta con solo color: combina forma de ícono (outline→filled o grosor) + color + opcionalmente negrita en el label.
8. **Iconos simples y universales** — nada artístico o ambiguo.
9. **Labels cortos, una sola línea** — nunca que el texto se parta en 2 líneas.
10. **Limpio y minimalista** — sin cajas/fondos por pestaña (ruido visual).
11. **Un solo estilo de ícono** (todo outline o todo filled) — excepción: el estado activo puede pasar a filled.
12. **No un color distinto por pestaña** — un solo color de marca para "activo", el resto neutro.
13. **Badges de notificación** — círculo/número en la esquina superior derecha del ícono, solo para notificaciones realmente importantes (evitar fatiga).
14. **Diseños creativos están bien, pero la usabilidad manda** sobre la estética.
15. **⚠️ El error #1 que comete hasta gente pro**: no separar visualmente el nav del contenido — usa borde sutil, color de fondo distinto, o una sombra suave (elevación).
16. **Colores neutros en el nav** (blanco/gris/oscuro) — reserva el color de marca vibrante para el estado activo y los CTAs del contenido, no para todo el nav.
17. **Contraste del estado inactivo** — no usar un gris tan claro que falle accesibilidad. WCAG exige mínimo 3:1 para componentes de interfaz/gráficos (SC 1.4.11). Mejor bajar opacidad que cambiar a un gris demasiado tenue.
18. **Micro-interacciones**: feedback al tocar (escala/color/ripple), indicador que se desliza entre pestañas en vez de saltar, transición suave (fade/slide) al cambiar de pantalla — no un "teletransporte".

## Auditoría contra el código real de Zestly

| # | Tip | Estado en Zestly | Veredicto |
|---|-----|-------------------|-----------|
| 1 | Solo destinos esenciales | Inicio/Calorías/Entrena/Plan/Progreso/Coach — todo core. Perfil vive en el engranaje, fuera del nav (correcto, es secundario) | ✅ Cumple |
| 2 | Labels + iconos para público mixto | Ya usa ambos (`<Icon/>` + `<span>{label}</span>`) | ✅ Cumple |
| 3 | Tamaños (~24px icono, 10-12px label) | Icono `size={20}` (un poco chico vs. recomendado), label `text-[10px]` (en el límite inferior recomendado) | ⚠️ Mejorable |
| 4 | Safe area / home indicator | `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` ya respeta el safe area nativo | ✅ Cumple |
| 5 | Máximo de pestañas | 6 pestañas — exactamente el techo que recomienda el video | ⚠️ En el límite — no agregar una 7ma |
| 6 | Área táctil ≥44×44px | Cada botón es `flex-1` (~60-70px de ancho en móvil) × ~50px alto — de sobra | ✅ Cumple |
| 7 | ≥2 cambios activo/inactivo | Ícono: grosor de línea (1.8→2.4) + color (ink3→brand-600) = 2 cambios ✅. Label: **solo cambia color, no peso** | ⚠️ Mejorable (falta negrita en el label activo) |
| 8 | Iconos simples/universales | lucide-react: Home, Flame, Dumbbell, UtensilsCrossed, BarChart3, Bot — todos reconocibles | ✅ Cumple |
| 9 | Labels cortos, 1 línea | Una palabra cada uno | ✅ Cumple |
| 10 | Limpio, sin cajas por tab | Sin fondos/bordes individuales por botón | ✅ Cumple |
| 11 | Un solo estilo de ícono | Todos outline (lucide default), el activo solo cambia grosor+color, no pasa a filled — **está permitido por el video** ("perfectamente aceptable mantenerlo outline si cambias el color") | ✅ Cumple |
| 12 | Un solo color para "activo" | Todos usan `brand-600`, ninguno tiene color propio | ✅ Cumple |
| 13 | Badges de notificación | No hay ningún concepto de notificación pendiente en la app hoy (no hay mensajes/alertas) | ➖ No aplica todavía |
| 15 | Separar nav del contenido | Ya tiene `border-t border-line` (borde superior) **y** fondo distinto (`bg-bg2` vs `bg-bg` del body) — dos técnicas del video ya aplicadas. Falta la tercera (sombra sutil de elevación) | ✅ Cumple (sombra es opcional/extra) |
| 16 | Colores neutros en el nav | `bg-bg2` es blanco/gris-oscuro neutro, el color de marca solo aparece en el ícono/label activo | ✅ Cumple |
| 17 | Contraste del estado inactivo | **Encontrado un bug real**: `text-ink3` en modo claro (`#94a3b8` sobre `#ffffff`) da un contraste de **~2.56:1** — por debajo del mínimo WCAG de 3:1 para íconos/UI. En modo oscuro sí pasa (~3.73:1) | ❌ **No cumple en modo claro** |
| 18 | Micro-interacciones | Tap feedback: `active:scale-90` ✅. Transición de pantalla: `fade-up` en `<main key={tab}>` (ya implementado en una ronda anterior) ✅. **Falta**: indicador deslizante/animado entre pestañas del propio nav (hoy el cambio de ícono/color es instantáneo, sin transición) | ⚠️ Mejorable |

**Conclusión general**: el nav de Zestly ya cumple la gran mayoría de las reglas del video — no es un rediseño, son ajustes puntuales. El único hallazgo que es un **bug real de accesibilidad** (no solo preferencia estética) es el contraste en modo claro.

## Plan de mejoras, priorizado

### Crítico — corregir
**1. Contraste del estado inactivo en modo claro (WCAG 1.4.11)**
- Archivo: `web/src/App.jsx` línea 136-137.
- Cambiar `text-ink3` → un tono más oscuro solo para el nav inactivo (no tocar el token `--text-3` global, se usa en muchos otros lugares donde no hace falta nivel AA). Ejemplo: `text-slate-500` (`#64748b`, ~4.76:1 sobre blanco) en vez de `text-ink3`.

### Fácil, alto impacto
**2. Negrita en el label activo** (el video insiste en combinar color + peso, no solo color)
- `className={activeTab === id ? 'text-brand-600 font-bold' : 'text-ink3 font-medium'}`

**3. Subir el ícono a 22-24px** (hoy 20px, el video recomienda 24px como punto óptimo)
- `<Icon size={22} .../>` — probar visualmente que no rompa el layout con 6 pestañas.

### Opcional / pulido
**4. Indicador deslizante o animación al cambiar de pestaña** — un pequeño fondo/píldora detrás del ícono activo que se desliza con `transition` en vez de aparecer instantáneo. Requiere trackear la posición del tab activo (más trabajo, evaluar si vale la pena con 6 pestañas fijas).

**5. Sombra sutil de elevación arriba del nav** — ya está separado por borde + color, esto sería un tercer refuerzo opcional (`shadow-[0_-2px_8px_rgba(0,0,0,0.06)]` o similar, muy sutil).

**6. Badge de notificación** — no aplica hoy (no hay conmocionepto de notificaciones pendientes), dejar documentado por si en el futuro se agrega algo como "tip del coach sin leer".

### No hacer
- No agregar una 7ma pestaña (ya está en el techo recomendado).
- No usar un color distinto por pestaña.
- No mezclar iconos filled/outline entre pestañas (solo el activo puede diferir).

---
*Generado a partir del transcript completo del video (no pude verlo directamente, solo leer el texto que se compartió) — 2026-08-17.*
