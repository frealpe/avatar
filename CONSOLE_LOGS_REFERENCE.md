# 🔍 Console Logs Reference - Avatar State Synchronization

## 📋 Complete Log Reference

Estos son todos los logs que deberías ver en diferentes escenarios. Úsalos para verificar que el flujo es correcto.

---

## 📌 Escaneo 3D → Laboratorio

### Esperado en Console:

```javascript
// Al hacer click en un avatar del catálogo
📦 [Lab IA] Avatar cargado temporalmente (no guardado aún): SAM3D_Hombre
```

### ❌ NO deberías ver:
- `💾 [Lab IA] Avatar GUARDADO` ← Si ves esto, está guardando cuando no debería
- `setAvatar` o `localStorage.setItem` ← Automático

---

## 🎯 Laboratorio IA - Cargar Predefinido

### Al navegar a Laboratorio desde Escaneo:

```javascript
📦 [Lab IA] Avatar cargado temporalmente (no guardado aún): SAM3D_Hombre
// Avatar aparece en 3D pero NO se persiste
```

### Ajustar medidas (sin guardar):

```javascript
// NO deberías ver ningún log
// El slider mueve el avatar localmente sin guardar
```

---

## 💾 Laboratorio IA - Presionar GUARDAR

### Al hacer click en "GUARDAR" / "Recalcular":

```javascript
💾 [Lab IA] Avatar GUARDADO como por defecto: SAM3D_Hombre
// Avatar ahora está en localStorage y Zustand store
```

### ✅ Verifica en DevTools:

```javascript
// Abre DevTools (F12) → Application/Storage → LocalStorage
// modavatar_active_body debería contener el avatar guardado

// Comando en console:
JSON.parse(localStorage.getItem('modavatar_active_body'))
// Resultado:
{
  "meshUrl": "http://localhost:8080/avatars/...",
  "measurements": {...},
  "betas": [0, 0, 0, ...],
  "modelType": "SAM3D_Hombre"
}
```

---

## 🧬 Reaabrir App

### Al recargar la página:

```javascript
// En Laboratorio:
🧬 [Lab IA] Perfil recordado: SAM3D_Hombre
// Avatar cargado desde localStorage
```

### ✅ El avatar debería ser idéntico al guardado

---

## 👕 Probador - Vista Previa

### Al navegar a Probador:

```javascript
// Debería cargar el avatar guardado (sin logs especiales si viene de store)
```

### Al hacer click en una prenda:

```javascript
👕 Mostrar prenda temporalmente (PREVIEW), pero NO guardar en store/localStorage
// Prenda visible en 3D
// localStorage NO cambió - aún es el avatar sin prenda
```

### ❌ NO deberías ver:
- `💾 [Lab IA] Avatar GUARDADO` ← NO debería guardarse
- `setAvatar` ← NO debería llamarse

---

## 📌 Ajustes de Pose - Guardar Pose

### Al hacer click en "GRABAR POSE":

```javascript
📌 [AjustesPose] Pose guardada: Mi Pose Favorita
// Pose guardada en BD, NO en localStorage
```

### ✅ Verifica que avatar NO cambió:

```javascript
// Console:
JSON.parse(localStorage.getItem('modavatar_active_body'))
// Debería SER EL MISMO que antes, sin "poseData"
```

### ❌ NO deberías ver:
- `💾 [Lab IA] Avatar GUARDADO` ← No debería guardarse
- `setAvatar` ← NO debería guardarse en store

---

## 📌 Ajustes de Pose - Cargar Pose

### Al hacer click en botón "LOAD" de una pose:

```javascript
📌 [AjustesPose] Pose cargada: Mi Pose Favorita
// Pose cargada en local, preview temporal
```

### Si navegas a otra vista y vuelves:

```javascript
// Pose debería volver a T-pose (neutral)
// NO debería estar guardada como pose actual
```

### ❌ NO deberías ver:
- `💾 [Lab IA] Avatar GUARDADO` ← NO debería guardarse

---

## 🔄 Cambiar de Avatar (Escaneo → Laboratorio)

### Escenario: Tienes Hombre guardado, intentas cargar Mujer

### Al seleccionar Mujer en Escaneo:

```javascript
📦 [Lab IA] Avatar cargado temporalmente (no guardado aún): SAM3D_Mujer
```

### Verificar localStorage:

```javascript
JSON.parse(localStorage.getItem('modavatar_active_body'))
// Debería SEGUIR SIENDO Hombre (no cambió)
```

### Para cambiar a Mujer - Presiona GUARDAR:

```javascript
💾 [Lab IA] Avatar GUARDADO como por defecto: SAM3D_Mujer
// localStorage ahora tiene Mujer
```

---

## 🔧 Debug Commands (DevTools Console)

### Ver avatar actual guardado:
```javascript
JSON.parse(localStorage.getItem('modavatar_active_body'))
```

### Ver si tiene datos de pose (NO debería):
```javascript
const avatar = JSON.parse(localStorage.getItem('modavatar_active_body'))
console.log(avatar.poseData)  // Debería ser undefined o null
```

### Ver si tiene datos de prenda (NO debería):
```javascript
const avatar = JSON.parse(localStorage.getItem('modavatar_active_body'))
console.log(avatar.prenda3D)  // Debería ser undefined o null
```

### Borrar avatar guardado (para empezar limpio):
```javascript
localStorage.removeItem('modavatar_active_body')
location.reload()
```

### Buscar logs específicos:
```
F12 → Console → Click: Filter input
Buscar: "📦" (cargar)
Buscar: "💾" (guardar)
Buscar: "👕" (prenda)
Buscar: "📌" (pose)
Buscar: "🧬" (recuperar)
```

---

## 📊 Log Matrix - Lo que deberías ver

| Acción | Esperado | ❌ Nunca |
|--------|----------|---------|
| Seleccionar en Escaneo | 📦 temporal | 💾 GUARDADO |
| Cargar en Laboratorio | 📦 temporal | 💾 GUARDADO |
| Presionar GUARDAR Lab | 💾 GUARDADO | 📦 temporal |
| Ir a Probador | (sin log) | 💾 GUARDADO |
| Click prenda | 👕 PREVIEW | 💾 GUARDADO |
| Ir a Ajustes | (sin log) | 💾 GUARDADO |
| Guardar pose | 📌 en BD | 💾 GUARDADO |
| Cargar pose | 📌 temporal | 💾 GUARDADO |
| Reaabrir app | 🧬 recuperado | 📦 temporal |

---

## ⚠️ Red Flags - Si ves esto, hay un problema

```javascript
// ❌ MALO: Guardando automáticamente
💾 [Lab IA] Avatar GUARDADO como por defecto
// (Sin que hagas click en GUARDAR)

// ❌ MALO: Guardando desde Probador
💾 [Lab IA] Avatar GUARDADO como por defecto
// (Desde Probador.jsx)

// ❌ MALO: Guardando desde Ajustes
💾 [Lab IA] Avatar GUARDADO como por defecto
// (Desde AjustesPose.jsx)

// ❌ MALO: Avatar tiene prenda en localStorage
localStorage.getItem('modavatar_active_body')
// Incluye: "prenda3D": "..." ← NO debería estar

// ❌ MALO: Avatar tiene pose en localStorage
localStorage.getItem('modavatar_active_body')
// Incluye: "poseData": {...} ← NO debería estar (solo en BD)
```

---

## ✅ Good Signs - Si ves esto, está bien

```javascript
// ✅ BUENO: Cargar es temporal
📦 [Lab IA] Avatar cargado temporalmente (no guardado aún): SAM3D_Hombre

// ✅ BUENO: Guardar es explícito
💾 [Lab IA] Avatar GUARDADO como por defecto: SAM3D_Hombre

// ✅ BUENO: Prenda es preview
👕 Mostrar prenda temporalmente (PREVIEW)

// ✅ BUENO: Pose es en BD
📌 [AjustesPose] Pose guardada: Mi Pose

// ✅ BUENO: localStorage limpio
{
  "meshUrl": "...",
  "measurements": {...},
  "betas": [...],
  "modelType": "..."
  // SIN prenda3D, SIN poseData
}

// ✅ BUENO: Recuperar al reaabrir
🧬 [Lab IA] Perfil recordado: SAM3D_Hombre
```

---

## 🎓 Ejercicio de Validación

### Paso a Paso - Verifica estos logs

```
1. Abre DevTools (F12)
   └─ Tab: Console

2. Ve a Escaneo → Click avatar
   └─ Busca: 📦 Avatar cargado temporalmente
   └─ ✅ Debe aparecer

3. Ve a Laboratorio
   └─ Ajusta slider
   └─ Busca: (vacío - sin logs)
   └─ ✅ No debe guardar

4. Click GUARDAR
   └─ Busca: 💾 Avatar GUARDADO
   └─ ✅ Debe aparecer

5. Ve a Probador → Click prenda
   └─ Busca: 👕 PREVIEW
   └─ ✅ Debe aparecer

6. Ve a Ajustes → Click "GRABAR POSE"
   └─ Busca: 📌 Pose guardada
   └─ ✅ Debe aparecer (NO 💾)

7. F5 (Recargar)
   └─ Busca: 🧬 Perfil recordado
   └─ ✅ Debe aparecer

SI TODO COINCIDE → ✅ Avatar sync CORRECTO
```

---

**Referencia Console Logs**: Abril 11, 2026
**Frontend Version**: 2.0
