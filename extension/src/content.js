let detectorController = null;
let currentBoxColor = "#FF0000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDetection") {
    if (!detectorController) {
      detectorController = new YouTubePageController();
      console.log("Face detection started!");
    }
  } else if (message.action === "stopDetection") {
    if (detectorController) {
      detectorController.cleanupCurrentDetector();
      detectorController = null;
      console.log("Face detection stopped!");
    }
  } else if (message.action === "updateColor") {
    currentBoxColor = message.color;
    console.log("Box color updated:", currentBoxColor);
  }
});

chrome.storage.local.get("detectionEnabled", (result) => {
  if (result.detectionEnabled) {
    detectorController = new YouTubePageController();
    console.log("Detection started automatically on page load.");
  } else {
    console.log("Detection disabled on page load.");
  }
});
