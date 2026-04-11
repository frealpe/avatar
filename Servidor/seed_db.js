// seed_db.js
// Script para poblar la base de datos con avatares y poses de ejemplo

require('dotenv').config();
const mongoose = require('mongoose');
const Avatar = require('./models/AvatarModel');
const Pose = require('./models/PoseModel');

const dbUrl = process.env.MONGODB_CNN || 'mongodb://127.0.0.1:27017/modavatar_db';

const predefinedAvatars = [
  {
    userId: 'demo_user',
    modelType: 'Anny_01',
    meshUrl: '/avatars/standard_male.glb',
    measurements: { height: 180, weight: 80, chest: 104, waist: 82, hips: 98, shoulders: 50, inseam: 80 },
    shapeParams: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    status: 'READY'
  },
  {
    userId: 'demo_user',
    modelType: 'Anny_01',
    meshUrl: '/avatars/standard_female.glb',
    measurements: { height: 170, weight: 60, chest: 88, waist: 64, hips: 92, shoulders: 40, inseam: 75 },
    shapeParams: [0.5, -1, 0, 0, 0, 0, 0, 0, 0, 0],
    status: 'READY'
  },
  {
    userId: 'demo_user',
    modelType: 'Anny_01',
    meshUrl: '/avatars/standard_curvy.glb',
    measurements: { height: 165, weight: 70, chest: 98, waist: 72, hips: 105, shoulders: 42, inseam: 72 },
    shapeParams: [2.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0],
    status: 'READY'
  }
];

const examplePoses = [
  {
    name: 'T-Pose',
    poseData: { Hombro_Izq: [0,0,0], Hombro_Der: [0,0,0], Codo_Izq: [0,0,0], Codo_Der: [0,0,0] },
    isDefault: true
  },
  {
    name: 'Pose Relajada',
    poseData: { Hombro_Izq: [10,0,0], Hombro_Der: [-10,0,0], Codo_Izq: [5,0,0], Codo_Der: [-5,0,0] },
    isDefault: false
  }
];

async function seed() {
  await mongoose.connect(dbUrl);
  console.log('Conectado a la base de datos.');

  await Avatar.deleteMany({});
  await Pose.deleteMany({});

  const avatars = await Avatar.insertMany(predefinedAvatars);
  console.log('Avatares insertados:', avatars.length);

  // Asignar poses a cada avatar
  for (const avatar of avatars) {
    for (const pose of examplePoses) {
      await Pose.create({ ...pose, avatarId: avatar._id });
    }
  }
  console.log('Poses insertadas para cada avatar.');

  await mongoose.disconnect();
  console.log('Desconectado. Seed finalizado.');
}

seed().catch(err => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
