# 🧪 QUICK QA TEST - Avatar Sync Fix

## ⚡ 5-Minute Validation Test

Sigue estos pasos EXACTAMENTE en orden. Toma ~5 minutos.

### Paso 1: Prep (1 min)
```
1. Abre: http://localhost:8086
2. Presiona F12 → Console (tab)
3. Limpia localStorage: 
   localStorage.removeItem('modavatar_active_body')
   location.reload()
```

### Paso 2: Seleccionar Avatar (1 min)
```
1. Va a: Escaneo 3D
2. Espera a que cargue catálogo
3. Click en un avatar (ej: "Hombre")
4. ✅ VERIFICA EN CONSOLE:
   - Debes ver: 📦 [Lab IA] Avatar cargado temporalmente
   - NO debes ver: 💾 [Lab IA] Avatar GUARDADO
5. ✅ Debería navegar a Laboratorio
```

### Paso 3: Guardar Avatar (1 min)
```
1. En Laboratorio, ver avatar en 3D
2. Click en botón "GUARDAR" (icono save)
3. ✅ VERIFICA EN CONSOLE:
   - Debes ver: 💾 [Lab IA] Avatar GUARDADO como por defecto
4. Ejecuta en console:
   JSON.parse(localStorage.getItem('modavatar_active_body'))
5. ✅ Debería mostrar avatar con meshUrl, betas, measurements
```

### Paso 4: Probador - Preview (1 min)
```
1. Va a: Probador
2. Click en una prenda (ej: "Camiseta")
3. ✅ VERIFICA EN CONSOLE:
   - Debes ver: 👕 Mostrar prenda temporalmente (PREVIEW)
   - NO debes ver: 💾 [Lab IA] Avatar GUARDADO
4. Ejecuta en console:
   JSON.parse(localStorage.getItem('modavatar_active_body'))
5. ✅ Debería ser IGUAL al guardado (SIN prenda3D)
```

### Paso 5: Ajustes - Pose (1 min)
```
1. Va a: Ajustes de Pose
2. Ajusta un slider (ej: Head rotation)
3. Click: "GRABAR POSE" con nombre "TestPose"
4. ✅ VERIFICA EN CONSOLE:
   - Debes ver: 📌 [AjustesPose] Pose guardada: TestPose
   - NO debes ver: 💾 [Lab IA] Avatar GUARDADO
5. Ejecuta en console:
   JSON.parse(localStorage.getItem('modavatar_active_body'))
6. ✅ Debería ser IGUAL al guardado (SIN poseData)
```

---

## ✅ Success Criteria (Todos deben ser SI)

- [ ] Paso 2: ✅ Viste 📦 (cargar)
- [ ] Paso 2: ✅ NO viste 💾 (no guardó)
- [ ] Paso 3: ✅ Viste 💾 (guardar)
- [ ] Paso 3: ✅ localStorage tiene avatar
- [ ] Paso 4: ✅ Viste 👕 (prenda preview)
- [ ] Paso 4: ✅ localStorage sin prenda
- [ ] Paso 5: ✅ Viste 📌 (pose)
- [ ] Paso 5: ✅ localStorage sin pose
- [ ] Paso 5: ✅ NO viste 💾 en poses

**SI TODOS SON SI → ✅ AVATAR SYNC CORRECTO**

---

## 🔧 Debug Si Algo Falla

### Si falla Paso 2:
```
- Problema: No ve 📦 o ve 💾
- Verificar: Escaneo.jsx no llama setAvatar
- Comando: 
  git diff HEAD~1 Frontend/src/views/avatar/Escaneo.jsx
```

### Si falla Paso 3:
```
- Problema: No ve 💾
- Verificar: LaboratorioIA handleRecalculate
- Comando:
  grep -n "setAvatar(finalResult)" Frontend/src/views/avatar/LaboratorioIA.jsx
```

### Si falla Paso 4:
```
- Problema: Ve 💾 en Probador
- Verificar: Probador handleTryOn
- Comando:
  grep -n "setAvatar" Frontend/src/views/avatar/Probador.jsx
  (Debería ser SOLO en línea 127 def, NO en handleTryOn)
```

### Si falla Paso 5:
```
- Problema: Ve 💾 en Ajustes
- Verificar: AjustesPose handleSavePose
- Comando:
  grep -n "setAvatar\|localStorage.setItem" Frontend/src/views/avatar/AjustesPose.jsx
  (Debería SOLO estar en socket listener, NO en handleSavePose)
```

---

## 📱 Multi-Device Testing

Repite los 5 pasos en:
- [ ] Chrome Desktop
- [ ] Firefox Desktop  
- [ ] Safari (si disponible)
- [ ] Mobile Chrome (F12 → Device mode)

---

## 📊 Final Validation

Ejecuta en console:

```javascript
// Debe ser true para todos
{
  noPreffaOnSelect: !localStorage.getItem('modavatar_active_body') || 
                    (Date.now() - JSON.parse(sessionStorage.getItem('_test_time') || '{}').t) < 2000,
  localStorage_clean: !JSON.parse(localStorage.getItem('modavatar_active_body'))?.prenda3D,
  localStorage_clean_pose: !JSON.parse(localStorage.getItem('modavatar_active_body'))?.poseData
}
```

---

## 🎯 Time Log

```
Test started: ___:___
Paso 1 (Prep): ___:___ (~1 min)
Paso 2 (Select): ___:___ (~1 min)
Paso 3 (Save): ___:___ (~1 min)
Paso 4 (Probador): ___:___ (~1 min)
Paso 5 (Ajustes): ___:___ (~1 min)
Total: ___:___ (~5 min)
```

---

## 📋 Report Template

```
✅ AVATAR SYNC TEST - RESULT

Device: ________________
Browser: ________________
Date: ________________

RESULTS:
□ Paso 1 ✅ / ❌
□ Paso 2 ✅ / ❌
□ Paso 3 ✅ / ❌
□ Paso 4 ✅ / ❌
□ Paso 5 ✅ / ❌

OVERALL: ✅ PASS / ❌ FAIL

Issues (if any):
- ________________
- ________________

Notes:
- ________________
- ________________
```

---

**QA Test Version**: 1.0
**Date**: Abril 11, 2026
**Expected Duration**: 5 minutes
