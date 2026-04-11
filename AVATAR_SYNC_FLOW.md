# 🎯 Flujo de Sincronización de Avatar - Moda App

## ✅ Comportamiento Correcto

### 1️⃣ **Seleccionar Avatar en Escaneo**
- Usuario: Va a **Escaneo 3D** → Selecciona "Hombre" (o "Mujer")
- Acción: **NO guarda** en `localStorage` ni en el store
- Resultado: Navega a **Laboratorio IA** con el avatar cargado temporalmente
- Console: `📦 [Lab IA] Avatar cargado temporalmente (no guardado aún)`

### 2️⃣ **Cargar Avatar en Laboratorio**
- Avatar aparece en el visor 3D
- Puedes ajustar medidas/betas
- **NO se guarda automáticamente** - es un estado temporal
- Console: `📦 [Lab IA] Avatar cargado temporalmente (no guardado aún)`

### 3️⃣ **Presionar GUARDAR en Laboratorio** ✅
- Usuario: Hace clic en botón "GUARDAR" / "Recalcular"
- Acción: **GUARDA** en `localStorage` Y en el store Zustand
- Console: `💾 [Lab IA] Avatar GUARDADO como por defecto: [tipo]`
- Efecto: Es el avatar por defecto de toda la aplicación
- Persiste: Al cerrar y reaabrir la app, carga este avatar

### 4️⃣ **Ver en Probador**
- Cuando navegas a **Probador**, carga el avatar guardado
- Puedes probar ropa (solo preview visual, no guarda)
- Console: `👕 Mostrar prenda temporalmente (PREVIEW)`
- La ropa NO persiste en el avatar guardado

### 5️⃣ **Editar Pose en Ajustes**
- Cuando navegas a **Ajustes de Pose**, carga el avatar guardado
- Puedes:
  - Ajustar la pose (sliders, IK)
  - GUARDAR una pose (se guarda en BD, no modifica avatar por defecto)
  - CARGAR una pose guardada (preview temporal)
- Console: `📌 [AjustesPose] Pose guardada/cargada: [nombre]`
- Las poses NO modifican el avatar por defecto

### 6️⃣ **Cerrar y Reaabrir App**
- Al recargar: Carga el avatar guardado en el último **GUARDAR** de Laboratorio
- Conserva: Medidas, betas, meshUrl
- NO conserva: Prendas seleccionadas (preview)
- NO conserva: Poses temporales (solo guardadas en BD con nombre)

---

## 🔍 Detalles Técnicos

### ¿Dónde se persiste?
- **localStorage**: `modavatar_active_body` - Avatar por defecto
- **Store Zustand**: `avatarData` - Avatar activo en memoria
- **MongoDB**: Poses guardadas (nombre + poseData + avatarId)

### ¿Cuándo se guarda en localStorage/store?

| Acción | Guarda | Lugar | Console |
|--------|--------|-------|---------|
| Seleccionar avatar en Escaneo | ❌ | - | 📦 temporal |
| Cargar en Laboratorio | ❌ | - | 📦 temporal |
| Presionar GUARDAR en Lab | ✅ | localStorage + store | 💾 GUARDADO |
| Seleccionar prenda en Probador | ❌ | liveAvatar (local) | 👕 PREVIEW |
| GUARDAR pose en Ajustes | ❌ | BD solamente | 📌 en BD |
| CARGAR pose en Ajustes | ❌ | liveAvatar (local) | 📌 temporal |
| Cerrar/reaabrir app | ✅ | De localStorage | 🧬 recuperado |

---

## 🚀 Flujo Completo - Ejemplo

```
1. Escaneo 3D
   └─> Click "Hombre"
       └─> NO guarda (📦 temporal)
           └─> Navega a Laboratorio

2. Laboratorio IA
   └─> Avatar visible en visor
   └─> Ajustas medidas
   └─> Click "GUARDAR"
       └─> ✅ GUARDA en localStorage + store (💾 GUARDADO)
           └─> Avatar ahora es el por defecto

3. Probador (Virtual Fitting)
   └─> Carga avatar guardado
   └─> Click prenda
       └─> 👕 PREVIEW (NO guarda)

4. Ajustes de Pose
   └─> Carga avatar guardado
   └─> Ajusta pose
   └─> Click "GRABAR POSE"
       └─> 📌 Se guarda en BD con nombre
           └─> NO cambia el avatar por defecto

5. Cerrar app y reaabrir
   └─> 🧬 Carga el avatar guardado en paso 2
       └─> Mismo estado de medidas, betas, meshUrl
```

---

## ❌ Problemas Resueltos

### ❌ ANTES: "Al sincronizar, se cambia de hombre a mujer"
- **Causa**: Probador guardaba prenda en store
- **Problema**: La prenda (view state) se confundía con avatar (model state)
- **Solución**: Probador solo carga desde store, no guarda

### ❌ ANTES: "Al cargar desde Escaneo, se guardaba automáticamente"
- **Causa**: Laboratorio guardaba en store al navegar
- **Problema**: No había diferencia entre "cargar" y "guardar"
- **Solución**: Cargar es temporal, guardar es explícito (click botón)

### ❌ ANTES: "Al guardar una pose, se cambiaba el avatar"
- **Causa**: Ajustes guardaba el avatar con pose en store
- **Problema**: Las poses se confundían con el avatar por defecto
- **Solución**: Poses se guardan en BD, no modifican avatar por defecto

---

## 📋 Testing Checklist

- [ ] Seleccionar avatar en Escaneo (no guarda)
- [ ] Ver en Laboratorio (no guarda)
- [ ] Presionar GUARDAR en Laboratorio (✅ guarda)
- [ ] Cambiar de vista a Probador (carga avatar guardado)
- [ ] Probar prenda en Probador (no guarda)
- [ ] Ir a Ajustes, cargar pose (no guarda)
- [ ] Guardar pose en Ajustes (BD only)
- [ ] Cerrar app y reaabrir (carga avatar original)
- [ ] Verificar localStorage en DevTools: `modavatar_active_body`

---

## 🔧 Console Logs para Debug

En DevTools (F12 → Console):

```javascript
// Ver avatar actual en store
JSON.parse(localStorage.getItem('modavatar_active_body'))

// Ver si se están guardando cambios no deseados
// Buscar: 💾 GUARDADO (solo debe aparecer al click GUARDAR)
// Buscar: 📦 temporal (aparece al navegar)
// Buscar: 👕 PREVIEW (no debe guardar)
// Buscar: 📌 temporal (poses, no guarda)
```

---

**Última actualización**: Abril 11, 2026
**Versión**: 2.0 - Avatar State Management Fixed
