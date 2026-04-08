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
    const { imagePath, userId, talla, patronValName, PORT } = job.data;
    const port = PORT || 8080;

    console.log(`🚀 [IA UNIFICADA] [Worker] Procesando job ${job.id} para usuario ${userId}...`);
    const startTime = Date.now();

    try {
      // 1. Promesa A: Procesamiento de Avatar 3D (SAM 3D Body)
      const meshPromise = AnnyPipeline.processImageToAnnyParams(imagePath || 'default_stream', io);

      // 2. Promesa B: Procesamiento 2D de Patrones de Costura (Ollama Local + Seamly)
      const patternPromise = PatternEngine.generatePattern(imagePath, talla, patronValName);

      // 3. Esperar a que Ambas IAs regresen (Si una falla, la otra de igual forma sobrevive)
      const [meshResult, patternResult] = await Promise.allSettled([meshPromise, patternPromise]);

      let params = {};
      let absoluteAvatarPath = null;
      if (meshResult.status === 'fulfilled') {
          params = meshResult.value;
          if (params.meshUrl) {
              const urlObj = new URL(params.meshUrl, `http://localhost:${port}`);
              absoluteAvatarPath = path.join(process.cwd(), 'public', urlObj.pathname);
          }
      } else {
          console.error(`❌ [Worker ${job.id}] Error en Generación SAM 3D:`, meshResult.reason);
      }

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
      let blenderPromise = Promise.resolve({ glbPrendaUrl: null });
      if (absoluteAvatarPath && absoluteSvgPath && fs.existsSync(absoluteAvatarPath) && fs.existsSync(absoluteSvgPath)) {
           const prendaOutputName = `prenda_${Date.now()}.glb`;
           blenderPromise = generarPrenda3D({
               avatarPath: absoluteAvatarPath,
               svgPath: absoluteSvgPath,
               outputName: prendaOutputName
           });
      } else {
           console.warn(`[Worker ${job.id}] [BLENDER ENGINE] Saltando simulación 3D: avatar o svg no disponibles localmente.`);
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
      console.log(`✅ [Worker] Job ${job.id} completado en ${totalTime.toFixed(2)}s`);

      // Notificar por websockets al cliente que su avatar final está listo
      if (io) {
        io.emit('avatar:completed', {
          jobId: job.id,
          userId,
          avatar: nuevoAvatar,
          telemetry: {
              totalExecutionTime: `${totalTime.toFixed(2)}s`,
              modelsUsed: ['SAM 3D Body', 'LLaVA-v1.5', 'Seamly2D-CLI', 'Blender-Cycles'],
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
