require("@tensorflow/tfjs-node");
const faceapi = require("@vladmandic/face-api");
const fs = require("fs");
const path = require("path");
const canvas = require("canvas");
const progress = require("progress");

const PROCESSED_DATA_PATH = path.join(__dirname, "../data/processed/train");
const MODEL_OUTPUT_PATH = path.join(__dirname, "../model/face-recognition");
const FACE_API_MODEL_PATH = path.join(
  __dirname,
  "../../extension/model/face-api"
);

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(FACE_API_MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(FACE_API_MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(FACE_API_MODEL_PATH);
}

async function processDirectory(
  dirPath,
  name,
  progressBar,
  totalProcessed,
  totalFiles
) {
  const descriptors = [];
  const files = fs
    .readdirSync(dirPath)
    .filter((file) =>
      [".jpg", ".jpeg", ".png"].includes(path.extname(file).toLowerCase())
    );

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      const img = await canvas.loadImage(filePath);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        const descriptor = Array.from(detections.descriptor);
        descriptors.push(descriptor);
      }
    } catch (error) {
      console.error(`Error processing ${file} for ${name}:`, error.message);
    }
    totalProcessed.count++;
    progressBar.tick();
    progressBar.curr = totalProcessed.count;
    progressBar.render();
  }

  return {
    count: descriptors.length,
    descriptors,
  };
}

async function trainModel() {
  const faceDatabase = [];
  const directories = fs
    .readdirSync(PROCESSED_DATA_PATH, {
      withFileTypes: true,
    })
    .filter((dirent) => dirent.isDirectory());

  let totalFiles = 0;
  for (const dirent of directories) {
    const dirPath = path.join(PROCESSED_DATA_PATH, dirent.name);
    const files = fs
      .readdirSync(dirPath)
      .filter((file) =>
        [".jpg", ".jpeg", ".png"].includes(path.extname(file).toLowerCase())
      );
    totalFiles += files.length;
  }

  const progressBar = new progress(
    "Training [:bar] :current/:total files :percent :etas",
    {
      complete: "=",
      incomplete: " ",
      width: 30,
      total: totalFiles,
    }
  );

  const totalProcessed = { count: 0 };

  for (const dirent of directories) {
    const name = dirent.name;
    const dirPath = path.join(PROCESSED_DATA_PATH, name);
    const { descriptors, count } = await processDirectory(
      dirPath,
      name,
      progressBar,
      totalProcessed,
      totalFiles
    );

    if (descriptors.length > 0) {
      faceDatabase.push({
        name,
        descriptors,
      });
    } else {
      console.warn(`\n⚠ Warning: No faces detected for ${name}`);
    }
  }

  const modelData = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    totalPeople: faceDatabase.length,
    totalDescriptors: faceDatabase.reduce(
      (sum, person) => sum + person.descriptors.length,
      0
    ),
    data: faceDatabase,
  };

  if (!fs.existsSync(MODEL_OUTPUT_PATH)) {
    fs.mkdirSync(MODEL_OUTPUT_PATH, { recursive: true });
  }

  const timestamp = Date.now();
  const modelName = `face_recognition_${timestamp}.json`;
  const outputPath = path.join(MODEL_OUTPUT_PATH, modelName);

  fs.writeFileSync(outputPath, JSON.stringify(modelData, null, 2));

  console.log("\nTraining Summary:");
  console.log(`✓ Total people processed: ${modelData.totalPeople}`);
  console.log(`✓ Total face descriptors: ${modelData.totalDescriptors}`);
  console.log(`✓ Model name: ${modelName}`);
}

async function main() {
  try {
    await loadModels();
    await trainModel();
    console.log("\n✨ Training completed successfully!");
  } catch (error) {
    console.error("\nError during training:", error);
    process.exit(1);
  }
}

main();
