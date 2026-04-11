# 🧪 Testing Guide - Avatar State Synchronization

## ✅ Quick Test Sequence

### Test 1: Cargar y Guardar Avatar
```
1. Abre: http://localhost:8086
2. Ve a: Escaneo 3D → Catalogo
3. Espera carga de avatares
4. Click: Hombre (o cualquier avatar)
5. ✅ Espera: NO se guarda automáticamente
   - Console debe mostrar: 📦 [Lab IA] Avatar cargado temporalmente
6. En Laboratorio:
   - Ver avatar en 3D
   - (Opcional) Ajusta sliders de medidas
7. Click: Botón "GUARDAR" (con icono save)
8. ✅ Espera: 
   - Console: 💾 [Lab IA] Avatar GUARDADO como por defecto
   - Avatar almacenado en localStorage
```

### Test 2: Persistencia al Reaabrir
```
1. Después de Test 1, avatar debe estar guardado
2. Click F12 → Console
3. Ejecuta: JSON.parse(localStorage.getItem('modavatar_active_body'))
4. ✅ Verifica: Debe mostrar el avatar que guardaste
5. Cierra navegador completamente
6. Reabre: http://localhost:8086
7. ✅ Espera: Laboratorio cargue con el mismo avatar guardado
   - Console: 🧬 [Lab IA] Perfil recordado
```

### Test 3: Probador No Guarda Cambios
```
1. Desde Laboratorio, click en Probador
2. ✅ Espera: Cargue el avatar guardado
3. En Probador:
   - Click prenda (ej: "Camiseta")
   - Ver prenda en 3D
4. ✅ Espera:
   - Console: 👕 Mostrar prenda temporalmente
   - NO debe guardar nada
5. Click F12 → Console
6. Ejecuta: JSON.parse(localStorage.getItem('modavatar_active_body'))
7. ✅ Verifica: Avatar debe ser IGUAL al guardado en Test 1
   - NO debe tener `prenda3D` o debe estar null
```

### Test 4: Pose No Modifica Avatar Por Defecto
```
1. Desde Probador, click en Ajustes de Pose
2. ✅ Espera: Cargue el avatar guardado
3. En Ajustes:
   - Ajusta joint (ej: Head)
   - Mueve slider de rotación
4. Click: "GRABAR POSE"
   - Nombre: "Prueba123"
   - Click GRABAR
5. ✅ Espera:
   - Console: 📌 [AjustesPose] Pose guardada: Prueba123
   - NO debe guardar avatar
6. Click F12 → Console
7. Ejecuta: JSON.parse(localStorage.getItem('modavatar_active_body'))
8. ✅ Verifica: Avatar SIN pose (poseData null o no incluido)
```

### Test 5: Cargar Pose Es Temporal
```
1. Estando en Ajustes (con poses guardadas)
2. En sección "Biblioteca de Poses":
   - Click botón "LOAD" en una pose
3. ✅ Espera:
   - Console: 📌 [AjustesPose] Pose cargada: [nombre]
   - Esqueleto cambie de posición
4. Click en avatar en viewport
5. Navega a Probador
6. Vuelve a Ajustes
7. ✅ Espera: Pose debe volver a T-pose (neutral)
   - NO debe recordar la pose temporalmente guardada
```

### Test 6: Cambiar de Avatar en Escaneo
```
1. Estando en Laboratorio (con avatar Hombre guardado)
2. Navega a: Escaneo 3D → Catalogo
3. Click: Mujer (diferente al actual)
4. ✅ Espera:
   - Carga en Laboratorio
   - Console: 📦 [Lab IA] Avatar cargado temporalmente
   - Avatar viejo NO debe cambiar
5. Click F12 → Console
6. Ejecuta: JSON.parse(localStorage.getItem('modavatar_active_body'))
7. ✅ Verifica: Avatar debe SER EL HOMBRE anterior
   - NO debe ser la Mujer que cargaste
8. Para cambiar: Presiona GUARDAR en Laboratorio
```

---

## 🔍 Console Logs a Buscar

| Log | Significado | OK? |
|-----|------------|-----|
| `📦 Avatar cargado temporalmente` | Cargar preview | ✅ Debe aparecer |
| `💾 Avatar GUARDADO como por defecto` | Guardado en store | ✅ Solo al click GUARDAR |
| `🧬 Perfil recordado` | Recuperado de storage | ✅ Al reaabrir |
| `👕 Mostrar prenda temporalmente` | Prenda preview | ✅ En Probador |
| `📌 Pose guardada` | Pose en BD | ✅ En Ajustes |
| `📌 Pose cargada` | Pose preview | ✅ Botón LOAD |

---

## 🛠️ Debug Commands (DevTools Console)

```javascript
// Ver avatar actual guardado
JSON.parse(localStorage.getItem('modavatar_active_body'))

// Ver si tiene prenda (NO debe tener si funciona bien)
localStorage.getItem('modavatar_active_body') |> console.log

// Buscar logs en console (Ctrl+Shift+K)
// Filtrar por: "Avatar"
// Filtrar por: "Pose"
// Filtrar por: "prenda"

// Borrar avatar para empezar limpio
localStorage.removeItem('modavatar_active_body')
location.reload()
```

---

## ❌ Problemas a Evitar

### ❌ Si ves: "Avatar cambió de hombre a mujer sin guardar"
- Causa: Una vista está guardando cambios no deseados
- Debug: Busca `setAvatar` o `localStorage.setItem` en esas vistas
- Solución: Verifica que solo Laboratorio guarde

### ❌ Si ves: "Prenda se quedó guardada"
- Causa: Probador está guardando `prenda3D` en store
- Debug: En localStorage debe estar `null` o no incluido
- Solución: Probador NO debe llamar `setAvatar`

### ❌ Si ves: "Pose se guardó como avatar"
- Causa: Ajustes está guardando avatar con pose
- Debug: Avatar en localStorage NO debe tener `poseData` con valores
- Solución: Ajustes solo guarda en BD, no en store

### ❌ Si ves: "Al reaabrir, perdió el avatar"
- Causa: No se guardó en localStorage
- Debug: Verifica que presionaste "GUARDAR" en Laboratorio
- Solución: localStorage debe tener la key `modavatar_active_body`

---

## ✅ Checklist de Validación

```
ANTES DE REPORTAR BUG:

[ ] ¿Guardaste en Laboratorio? (click GUARDAR)
[ ] ¿Verificaste localStorage? (F12 → Storage → LocalStorage)
[ ] ¿Buscaste en Console logs? (F12 → Console, buscar 💾)
[ ] ¿Recargaste la página? (F5)
[ ] ¿Borraste cache? (Ctrl+Shift+Delete)
[ ] ¿Viste los logs esperados?
    - Cargar: 📦 temporal
    - Guardar: 💾 GUARDADO
    - Prenda: 👕 PREVIEW
    - Pose: 📌 en BD

SI TODO ES "NO" ARRIBA → Funciona correctamente ✅
```

---

## 📱 Device Testing

```
Desktop:
- ✅ Chrome
- ✅ Firefox
- ✅ Safari

Mobile:
- ⚠️ Revisar localStorage en mobile
- ⚠️ Revisar console en browser mobile (ej: Chrome DevTools)
```

---

## 🎯 Success Criteria

✅ **Test 1**: Avatar guardado después de GUARDAR en Laboratorio
✅ **Test 2**: Avatar persiste al reaabrir
✅ **Test 3**: Prenda NO guarda cambios
✅ **Test 4**: Pose NO modifica avatar por defecto
✅ **Test 5**: Pose cargada es temporal
✅ **Test 6**: Cambiar avatar en Escaneo NO afecta el guardado

**Si todos pasan** → 🚀 Avatar sync está CORRECTO

---

**Test Created**: Abril 11, 2026
**Frontend Version**: 2.0
