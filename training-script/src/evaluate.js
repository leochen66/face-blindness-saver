require("@tensorflow/tfjs-node");
const faceapi = require("@vladmandic/face-api");
const fs = require("fs");
const path = require("path");
const canvas = require("canvas");
const ProgressBar = require("progress");

const TEST_DATA_PATH = path.join(__dirname, "../data/processed/test");
const MODEL_PATH = path.join(__dirname, "../model/face-recognition");
const FACE_API_MODEL_PATH = path.join(
  __dirname,
  "../../extension/model/face-api"
);

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

function getLatestModelPath() {
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Model directory not found: ${MODEL_PATH}`);
  }

  const files = fs
    .readdirSync(MODEL_PATH)
    .filter(
      (file) => file.startsWith("face_recognition_") && file.endsWith(".json")
    )
    .map((file) => ({
      name: file,
      path: path.join(MODEL_PATH, file),
      timestamp: parseInt(
        file.replace("face_recognition_", "").replace(".json", "")
      ),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (files.length === 0) {
    throw new Error("No model files found in the directory");
  }

  return files[0].path;
}

function loadTrainedModel() {
  const modelData = JSON.parse(fs.readFileSync(getLatestModelPath()));
  return modelData.data.map((person) => ({
    name: person.name,
    descriptors: person.descriptors.map((desc) => new Float32Array(desc)),
  }));
}

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(FACE_API_MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(FACE_API_MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(FACE_API_MODEL_PATH);
}

function findBestMatch(descriptor, trainedData) {
  let bestMatch = { name: "unknown", distance: Infinity };

  for (const person of trainedData) {
    for (const trainedDescriptor of person.descriptors) {
      const distance = faceapi.euclideanDistance(descriptor, trainedDescriptor);
      if (distance < bestMatch.distance) {
        bestMatch = { name: person.name, distance };
      }
    }
  }

  return bestMatch;
}

async function evaluateModel() {
  const trainedData = loadTrainedModel();
  const results = {
    total: 0,
    correct: 0,
    incorrect: 0,
    perPersonResults: {},
  };

  const directories = fs.readdirSync(TEST_DATA_PATH, { withFileTypes: true });
  let totalImages = 0;
  for (const dirent of directories) {
    if (!dirent.isDirectory()) continue;
    const dirPath = path.join(TEST_DATA_PATH, dirent.name);
    const files = fs
      .readdirSync(dirPath)
      .filter((file) =>
        [".jpg", ".jpeg", ".png"].includes(path.extname(file).toLowerCase())
      );
    totalImages += files.length;
  }

  const progress = new ProgressBar(
    "Evaluating [:bar] :current/:total images (:percent) :etas",
    {
      complete: "=",
      incomplete: " ",
      width: 30,
      total: totalImages,
    }
  );

  for (const dirent of directories) {
    if (!dirent.isDirectory()) continue;

    const name = dirent.name;
    const dirPath = path.join(TEST_DATA_PATH, name);
    const files = fs.readdirSync(dirPath);

    results.perPersonResults[name] = {
      total: 0,
      correct: 0,
      incorrect: 0,
    };

    for (const file of files) {
      if (
        ![".jpg", ".jpeg", ".png"].includes(path.extname(file).toLowerCase())
      ) {
        continue;
      }

      try {
        const filePath = path.join(dirPath, file);
        const img = await canvas.loadImage(filePath);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const bestMatch = findBestMatch(detection.descriptor, trainedData);
          const isCorrect = bestMatch.name === name;

          results.total++;
          results.perPersonResults[name].total++;

          if (isCorrect) {
            results.correct++;
            results.perPersonResults[name].correct++;
          } else {
            results.incorrect++;
            results.perPersonResults[name].incorrect++;
          }
        }

        progress.tick();
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }
  }

  console.log("\nEvaluation Results:");
  console.log("-------------------");
  console.log(
    `Overall Accuracy: ${((results.correct / results.total) * 100).toFixed(2)}%`
  );
  console.log(`Total Images Processed: ${results.total}`);
  console.log(`Correct Predictions: ${results.correct}`);
  console.log(`Incorrect Predictions: ${results.incorrect}`);

  console.log("-------------------");
  for (const [person, stats] of Object.entries(results.perPersonResults)) {
    const accuracy = ((stats.correct / stats.total) * 100).toFixed(2);
    console.log(`${person}:`);
    console.log(`  Accuracy: ${accuracy}%`);
    console.log(`  Correct: ${stats.correct}/${stats.total}`);
  }
}

async function main() {
  try {
    await loadModels();
    await evaluateModel();
    console.log("\n✨ Evaluation completed successfully!");
  } catch (error) {
    console.error("Error during evaluation:", error);
    process.exit(1);
  }
}

main();
