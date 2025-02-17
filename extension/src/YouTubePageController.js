class YouTubePageController {
  constructor() {
    this.detector = null;
    this.initializeController();
  }

  initializeController() {
    this.setupNavigationObserver();
    this.checkAndInitialize();
  }

  setupNavigationObserver() {
    let lastUrl = location.href;

    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log("URL changed, checking initialization...");
        this.cleanupCurrentDetector();
        this.checkAndInitialize();
      }
    }).observe(document.querySelector("body"), {
      subtree: true,
      childList: true,
    });
  }

  async checkAndInitialize() {
    if (!window.location.pathname.includes("/watch")) {
      console.log("Not a watch page, skipping initialization");
      return;
    }

    console.log("Watch page detected, starting initialization process");
    await this.waitForPageReady();
    this.cleanupCurrentDetector();
    this.detector = new YouTubeFaceDetector();
  }

  cleanupCurrentDetector() {
    if (this.detector) {
      console.log("Cleaning up existing detector");
      this.detector.cleanup();
      this.detector = null;
    }
  }

  async waitForPageReady() {
    console.log("Waiting for page to be ready...");

    return new Promise((resolve) => {
      const checkPage = () => {
        const video = document.querySelector("video");
        const playerContainer = document.querySelector("#player-container");

        if (video && video.readyState >= 2 && playerContainer) {
          console.log("Page elements are ready");
          resolve();
          return true;
        }
        return false;
      };

      if (checkPage()) return;

      let attempts = 0;
      const maxAttempts = 50;

      const interval = setInterval(() => {
        attempts++;

        if (checkPage() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts) {
            console.log("Page ready check timed out");
          }
          resolve();
        }
      }, 200);
    });
  }
}
