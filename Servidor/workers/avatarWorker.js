const { Worker } = require('bullmq');
const { connection } = require('../helpers/queue');

const Avatar = require('../models/AvatarModel');
const AnnyPipeline = require('../services/annyPipeline');
const PatternEngine = require('../services/pattern_engine');
const { generarPrenda3D } = require('../services/blender_engine');
const path = require('path');
const fs = require('fs');

/**
 * Industrial Worker for Avatar and Garment Generation
 */
const setupWorker = (io) => {
  const worker = new Worker('avatarGeneration', async (job) => {
    const { imagePath, userId, talla, patronValName, target, PORT } = job.data;
    const port = PORT || 8080;
    const startTime = Date.now();

    try {
      console.log(`[STATUS] PROCESANDO: Job ${job.id} (${target}) para usuario ${userId}...`);
      
      // 1. Promesa A: Procesamiento de Avatar 3D
      let meshPromise = Promise.resolve(null);
      if (target === 'both' || target === 'body') {
          meshPromise = AnnyPipeline.processImageToAnnyParams(imagePath || 'default_stream', io);
      }

      // 2. Promesa B: Procesamiento 2D de Patrones
      let patternPromise = Promise.resolve(null);
      if (target === 'both' || target === 'garment') {
          patternPromise = PatternEngine.generatePattern(imagePath, talla, patronValName);
      }

      // 3. Esperar resultados con protección ante fallos
      const [meshResult, patternResult] = await Promise.allSettled([meshPromise, patternPromise]);

      let params = {};
      let absoluteAvatarPath = null;
      
      if (meshResult.status === 'fulfilled' && meshResult.value) {
          params = meshResult.value;
          if (params.meshUrl) {
              const urlObj = new URL(params.meshUrl, `http://localhost:${port}`);
              absoluteAvatarPath = path.join(process.cwd(), 'public', urlObj.pathname);
          }
      } else {
          console.warn(`[WARNING] Fallo en Generación SAM 3D: ${meshResult.reason || 'No data'}`);
      }

      // Fallback de medidas industriales si faltan (Crucial para que el front no muera)
      if (!params || !params.measurements || !params.measurements.height) {
          params = { 
              modelType: params?.modelType || 'Unified_AI_01', 
              meshUrl: params?.meshUrl || null, 
              measurements: {
                  height: 170, weight: 70, chest: 95, waist: 85, hips: 100
              }, 
              shapeParams: params?.shapeParams || Array(12).fill(0), 
              poseParams: params?.poseParams || [] 
          };
      }

      let patternUrl = null;
      let garmentParams = {};
      let absoluteSvgPath = null;
      
      if (patternResult.status === 'fulfilled' && patternResult.value) {
          patternUrl = patternResult.value.url;
          garmentParams = patternResult.value.params;
          absoluteSvgPath = patternResult.value.absoluteSvgPath;
      } else {
          console.warn(`[WARNING] Fallo en Pipeline de patrones (Seamly2D disabled): ${patternResult.reason || 'No data'}`);
      }

      // 4. Promesa C: Generación de Prenda 3D en Blender (Fallback Industrial)
      if (!absoluteAvatarPath || !fs.existsSync(absoluteAvatarPath)) {
          // Anny local removed: no buscamos archivos recalc_*.glb generados localmente.
          // Simple fallback a los avatares estándar incluidos en el repo.
          console.log(`[STATUS] Avatar no disponible - usando avatar estándar como fallback.`);
          const standardCandidates = [
              path.join(process.cwd(), 'public', 'avatars', 'standard_male.glb'),
              path.join(process.cwd(), 'public', 'avatars', 'standard_female.glb'),
              path.join(process.cwd(), 'public', 'avatars', 'standard_curvy.glb')
          ];
          for (const candidate of standardCandidates) {
              if (fs.existsSync(candidate)) { absoluteAvatarPath = candidate; console.log(`[STATUS] SUCCESS: Usando fallback estándar: ${path.basename(candidate)}`); break; }
          }
      }

      let prenda3DUrl = null;
      if (absoluteAvatarPath && absoluteSvgPath && fs.existsSync(absoluteAvatarPath) && fs.existsSync(absoluteSvgPath)) {
           const prendaOutputName = `prenda_${Date.now()}.glb`;
           console.log(`[ENGINE] STATUS: Iniciando simulación 3D Blender...`);
           try {
               const blenderResult = await generarPrenda3D({
                   avatarPath: absoluteAvatarPath,
                   svgPath: absoluteSvgPath,
                   outputName: prendaOutputName
               });
               if (blenderResult && blenderResult.glbPrendaUrl) {
                   prenda3DUrl = `http://localhost:${port}${blenderResult.glbPrendaUrl}`;
               }
           } catch (blenderErr) {
               console.error(`[ENGINE] CRITICAL: Error en Blender Engine: ${blenderErr.message}`);
           }
      } else {
           console.warn(`[ENGINE] WARNING: Simulación 3D omitida (Faltan archivos: Avatar=${!!absoluteAvatarPath}, SVG=${!!absoluteSvgPath})`);
      }

      // 5. Instanciar y guardar en MongoDB
      const nuevoAvatar = new Avatar({
          userId,
          modelType: params.modelType || 'Unified_AI_01',
          meshUrl: params.meshUrl || null,
          measurements: params.measurements || {},
          shapeParams: params.shapeParams || [],
          poseParams: params.poseParams || [],
          patternUrl: patternUrl,
          garmentParams: garmentParams,
          prenda3D: prenda3DUrl,
          status: 'READY'
      });

      await nuevoAvatar.save();

      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`[STATUS] FINALIZADO: Job ${job.id} completado en ${totalTime.toFixed(2)}s`);

      // 6. Construir telemetría dinámica
      const modelsUsed = [];
      if (target === 'both' || target === 'body') modelsUsed.push('SAM 3D / Anny v2');
      if (target === 'both' || target === 'garment') {
          modelsUsed.push('LLaVA v1.5');
          // Seamly2D removed: pattern generation disabled in this build
      }
      if (prenda3DUrl) modelsUsed.push('Blender Cycles (Sim)');

      // Notificar por websockets al cliente que su avatar final está listo
      if (io) {
        io.emit('avatar:completed', {
          jobId: job.id,
          userId,
          target,
          avatar: nuevoAvatar,
          telemetry: {
              totalExecutionTime: `${totalTime.toFixed(2)}s`,
              modelsUsed,
              timestamp: new Date()
          }
        });
      }

      return nuevoAvatar;

    } catch (criticalErr) {
        console.error(`[CRITICAL ERROR] Fallo catastrófico en Worker ${job.id}:`, criticalErr);
        if (io) {
            io.emit('avatar:error', {
                jobId: job.id,
                userId: job.data.userId,
                error: criticalErr.message
            });
        }
        throw criticalErr; // Re-lanzar para que BullMQ lo maneje
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
                console.log(`[STATUS] CLEANUP: Archivo temporal eliminado: ${path.basename(imagePath)}`);
            } catch (cleanupErr) {
                console.error(`[WARNING] Error cleanup ${imagePath}:`, cleanupErr.message);
            }
        }
    }
  }, { connection });

  worker.on('completed', job => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
  });

  return worker;
};

module.exports = { setupWorker };
