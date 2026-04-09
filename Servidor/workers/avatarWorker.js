const { Worker } = require('bullmq');
const { connection } = require('../helpers/queue');

const Avatar = require('../models/AvatarModel');
const AnnyPipeline = require('../services/annyPipeline');
const PatternEngine = require('../services/pattern_engine');
const { generarPrenda3D } = require('../services/blender_engine');
const path = require('path');
const fs = require('fs');

const setupWorker = (io) => {
  const worker = new Worker('avatarGeneration', async (job) => {
    const { imagePath, userId, talla, patronValName, target, PORT } = job.data;
    const port = PORT || 8080;

    console.log(`🚀 [IA UNIFICADA] [Worker] Procesando job ${job.id} (${target}) para usuario ${userId}...`);
    const startTime = Date.now();

    try {
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

      // 3. Esperar a que Ambas IAs regresen (Si una falla, la otra de igual forma sobrevive)
      const [meshResult, patternResult] = await Promise.allSettled([meshPromise, patternPromise]);

      let params = {};
      let absoluteAvatarPath = null;
      if (meshResult.status === 'fulfilled') {
          params = meshResult.value;
          if (params && params.meshUrl) {
              const urlObj = new URL(params.meshUrl, `http://localhost:${port}`);
              absoluteAvatarPath = path.join(process.cwd(), 'public', urlObj.pathname);
          }
      } else {
          console.error(`❌ [Worker ${job.id}] Error en Generación SAM 3D:`, meshResult.reason);
      }

      if (!params || !params.measurements || !params.measurements.height) {
          params = { 
              modelType: params?.modelType || 'Unified_AI_01', 
              meshUrl: params?.meshUrl || null, 
              measurements: {
                  height: params?.measurements?.height || 170,
                  weight: params?.measurements?.weight || 70,
                  chest: params?.measurements?.chest || 95,
                  waist: params?.measurements?.waist || 85,
                  hips: params?.measurements?.hips || 100
              }, 
              shapeParams: params?.shapeParams || Array(12).fill(0), 
              poseParams: params?.poseParams || [] 
          };
      }

      console.log(`[Worker ${job.id}] Unificación de parámetros finalizada. Altura detectada: ${params?.measurements?.height}cm`);
      
      let patternUrl = null;
      let garmentParams = {};
      let absoluteSvgPath = null;
      if (patternResult.status === 'fulfilled') {
          patternUrl = patternResult.value.url;
          garmentParams = patternResult.value.params;
          absoluteSvgPath = patternResult.value.absoluteSvgPath;
      } else {
          console.error(`❌ [Worker ${job.id}] Error en Pipeline Local Ollama/Seamly:`, patternResult.reason);
      }

      // 4. Promesa C: Generación de Prenda 3D en Blender
      // Si no hay avatar 3D generado en este job, buscar el más reciente o usar estándar
      if (!absoluteAvatarPath || !fs.existsSync(absoluteAvatarPath || '')) {
          console.log(`[Worker ${job.id}] [BLENDER] Avatar no disponible en este job. Buscando fallback...`);
          
          // Buscar el avatar SMPL-X más reciente
          const tempDir = path.join(process.cwd(), 'public', 'temp');
          if (fs.existsSync(tempDir)) {
              const recalcFiles = fs.readdirSync(tempDir)
                  .filter(f => f.startsWith('recalc_') && f.endsWith('.glb'))
                  .map(f => ({ name: f, mtime: fs.statSync(path.join(tempDir, f)).mtimeMs }))
                  .sort((a, b) => b.mtime - a.mtime);
              
              if (recalcFiles.length > 0) {
                  absoluteAvatarPath = path.join(tempDir, recalcFiles[0].name);
                  console.log(`[Worker ${job.id}] [BLENDER] ✅ Usando avatar reciente: ${recalcFiles[0].name}`);
              }
          }

          // Si no hay recalc, usar avatar estándar
          if (!absoluteAvatarPath || !fs.existsSync(absoluteAvatarPath || '')) {
              const standardAvatar = path.join(process.cwd(), 'public', 'avatars', 'standard_male.glb');
              if (fs.existsSync(standardAvatar)) {
                  absoluteAvatarPath = standardAvatar;
                  console.log(`[Worker ${job.id}] [BLENDER] ✅ Usando avatar estándar: standard_male.glb`);
              }
          }
      }

      let blenderPromise = Promise.resolve({ glbPrendaUrl: null });
      if (absoluteAvatarPath && absoluteSvgPath && fs.existsSync(absoluteAvatarPath) && fs.existsSync(absoluteSvgPath)) {
           const prendaOutputName = `prenda_${Date.now()}.glb`;
           console.log(`[Worker ${job.id}] [BLENDER] 🚀 Iniciando simulación 3D de prenda...`);
           blenderPromise = generarPrenda3D({
               avatarPath: absoluteAvatarPath,
               svgPath: absoluteSvgPath,
               outputName: prendaOutputName
           });
      } else {
           console.warn(`[Worker ${job.id}] [BLENDER ENGINE] Saltando simulación 3D: avatar=${!!absoluteAvatarPath} svg=${!!absoluteSvgPath}`);
      }

      const [blenderResult] = await Promise.allSettled([blenderPromise]);

      let prenda3DUrl = null;
      if (blenderResult.status === 'fulfilled') {
           if (blenderResult.value && blenderResult.value.glbPrendaUrl) {
               prenda3DUrl = `http://localhost:${port}${blenderResult.value.glbPrendaUrl}`;
           }
      } else {
           console.error(`❌ [Worker ${job.id}] Error en Blender Engine 3D:`, blenderResult.reason);
      }

      // Instanciar y guardar la unificación en MongoDB
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
      console.log(`✅ [Worker] Job ${job.id} (${target}) completado en ${totalTime.toFixed(2)}s`);

      // 5. Construir telemetría dinámica
      const modelsUsed = [];
      if (target === 'both' || target === 'body') modelsUsed.push('SAM 3D / Anny v2');
      if (target === 'both' || target === 'garment') {
          modelsUsed.push('LLaVA v1.5');
          modelsUsed.push('Seamly2D CLI');
      }
      if (prenda3DUrl) modelsUsed.push('Blender Cycles (Sim)');

      // Notificar por websockets al cliente que su avatar final está listo
      if (io) {
        io.emit('avatar:completed', {
          jobId: job.id,
          userId,
          target, // Pasar el target original para que el front sepa qué panel actualizar
          avatar: nuevoAvatar,
          telemetry: {
              totalExecutionTime: `${totalTime.toFixed(2)}s`,
              modelsUsed,
              timestamp: new Date()
          }
        });
      }

      return nuevoAvatar;

    } catch (error) {
      console.error(`❌ [Worker] Error crítico en Job ${job.id}:`, error);
      if (io) {
          io.emit('avatar:error', {
              jobId: job.id,
              userId,
              error: error.message
          });
      }
      throw error;
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
                console.log(`🧹 [Worker] Temporary file deleted: ${imagePath}`);
            } catch (cleanupErr) {
                console.error(`⚠️ [Worker] Error cleaning up file ${imagePath}:`, cleanupErr.message);
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
