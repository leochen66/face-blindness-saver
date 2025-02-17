const fs = require("fs");
const path = require("path");

const RAW_DATA_PATH = path.join(__dirname, "../data/raw");
const PROCESSED_DATA_PATH = path.join(__dirname, "../data/processed");
const TRAIN_TEST_SPLIT = 0.8;

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function main() {
  try {
    ensureDirectoryExists(path.join(PROCESSED_DATA_PATH, "train"));
    ensureDirectoryExists(path.join(PROCESSED_DATA_PATH, "test"));

    const items = fs.readdirSync(RAW_DATA_PATH);
    const personFolders = items.filter((item) =>
      fs.statSync(path.join(RAW_DATA_PATH, item)).isDirectory()
    );

    for (const personFolder of personFolders) {
      const personPath = path.join(RAW_DATA_PATH, personFolder);
      const images = fs
        .readdirSync(personPath)
        .filter((file) => file.match(/\.(jpg|jpeg|png)$/i));

      // Shuffle images
      const shuffledImages = shuffleArray([...images]);

      // Calculate split index
      const splitIndex = Math.floor(shuffledImages.length * TRAIN_TEST_SPLIT);
      const trainImages = shuffledImages.slice(0, splitIndex);
      const testImages = shuffledImages.slice(splitIndex);

      // Create corresponding train and test directories
      const trainPersonPath = path.join(
        PROCESSED_DATA_PATH,
        "train",
        personFolder
      );
      const testPersonPath = path.join(
        PROCESSED_DATA_PATH,
        "test",
        personFolder
      );
      ensureDirectoryExists(trainPersonPath);
      ensureDirectoryExists(testPersonPath);

      // Copy training images
      for (const image of trainImages) {
        fs.copyFileSync(
          path.join(personPath, image),
          path.join(trainPersonPath, image)
        );
      }

      // Copy testing images
      for (const image of testImages) {
        fs.copyFileSync(
          path.join(personPath, image),
          path.join(testPersonPath, image)
        );
      }

      console.log(
        `${personFolder}: ${trainImages.length} training images, ${testImages.length} test images`
      );
    }

    console.log("✨ Preprocessing completed successfully!");
  } catch (error) {
    console.error("Error during preprocessing:", error);
    process.exit(1);
  }
}

main();
