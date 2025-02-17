class YouTubeFaceDetector {
  constructor() {
    this.initAttempts = 0;
    this.maxAttempts = 3;
    this.isInitialized = false;
    this.isModelsLoaded = false;
    this.animationFrameId = null;
    this.forwardTimes = [];
    this.withBoxes = true;
    this.withLandmarks = false;
    this.faceMatcher = null;
    this.init();
  }

  async init() {
    if (this.isInitialized) {
      console.log("Already initialized, skipping...");
      return;
    }

    console.log(
      `Initializing face detector (attempt ${this.initAttempts + 1}/${
        this.maxAttempts
      })...`
    );

    try {
      const video = await this.waitForVideo();
      if (!video) {
        throw new Error("Video element not found or not ready");
      }
      this.video = video;

      this.setupVideoEvents();
      await this.setupCanvas();
      await this.loadModels();
      await this.setupFaceMatcher();

      if (!this.canvas || !this.isModelsLoaded || !this.faceMatcher) {
        throw new Error("Components not initialized properly");
      }

      this.isInitialized = true;
      this.startDetection();
      this.handleVideoResize();
      console.log("Initialization complete");
    } catch (error) {
      console.error("Initialization error:", error);
      await this.handleInitError();
    }
  }

  setupVideoEvents() {
    if (!this.video) {
      return;
    }

    this.video.addEventListener("seeked", () => {
      if (this.isInitialized) {
        this.cleanup();
        this.init();
      }
    });
  }

  async setupFaceMatcher() {
    try {
      // Fetch the face recognition model
      const response = await fetch(
        chrome.runtime.getURL("model/face-recognition/face_recognition.json")
      );
      const celebrityData = await response.json();

      // Create LabeledFaceDescriptors for each celebrity
      const labeledFaceDescriptors = celebrityData.data.map((celebrity) => {
        const descriptors = celebrity.descriptors.map(
          (desc) => new Float32Array(desc)
        );
        return new faceapi.LabeledFaceDescriptors(celebrity.name, descriptors);
      });

      this.faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
      console.log("Face matcher setup complete");
    } catch (error) {
      console.error("Error setting up face matcher:", error);
      throw error;
    }
  }

  async handleInitError() {
    if (this.initAttempts < this.maxAttempts) {
      this.initAttempts++;
      console.log(`Retrying initialization in 2 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.init();
    } else {
      console.error("Max initialization attempts reached");
      this.cleanup();
    }
  }

  cleanup() {
    console.log("Cleaning up detector resources");
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.isInitialized = false;
    this.isModelsLoaded = false;
  }

  async waitForVideo() {
    console.log("Waiting for video element...");
    return new Promise((resolve) => {
      const checkVideo = () => {
        const video = document.querySelector("video");
        return video && video.readyState >= 2 ? video : null;
      };

      const video = checkVideo();
      if (video) {
        console.log("Video element found and ready immediately");
        resolve(video);
        return;
      }

      let attempts = 0;
      const maxAttempts = 100;

      const interval = setInterval(() => {
        attempts++;
        const video = checkVideo();

        if (video || attempts >= maxAttempts) {
          clearInterval(interval);
          if (video) {
            console.log("Video element found and ready");
          } else {
            console.log("Video element check timed out");
          }
          resolve(video);
        }
      }, 100);
    });
  }

  async setupCanvas() {
    console.log("Setting up canvas");

    const existingCanvas = document.querySelector(".face-detection-canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.canvas.className = "face-detection-canvas";

    const videoContainer = this.video.parentElement;
    if (!videoContainer) {
      throw new Error("Video container not found");
    }

    videoContainer.style.position = "relative";

    this.canvas.width = this.video.clientWidth;
    this.canvas.height = this.video.clientHeight;

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = `${this.video.clientWidth}px`;
    this.canvas.style.height = `${this.video.clientHeight}px`;
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "1000";

    videoContainer.appendChild(this.canvas);
    console.log("Canvas setup complete with dimensions:", {
      width: this.canvas.width,
      height: this.canvas.height,
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height,
    });
  }

  async loadModels() {
    console.log(`Starting to load face-api models...`);
    try {
      // await faceapi.nets.ssdMobilenetv1.loadFromUri(
      //   chrome.runtime.getURL("model/face-api")
      // );
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        chrome.runtime.getURL("model/face-api")
      );
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        chrome.runtime.getURL("model/face-api")
      );
      await faceapi.nets.faceRecognitionNet.loadFromUri(
        chrome.runtime.getURL("model/face-api")
      );

      this.isModelsLoaded = true;
      console.log("Models loaded successfully");
    } catch (error) {
      console.error("Error loading models:", error);
      throw error;
    }
  }

  handleVideoResize() {
    console.log("Setting up resize observer");
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.video && this.canvas) {
          this.canvas.width = this.video.clientWidth;
          this.canvas.height = this.video.clientHeight;
          this.canvas.style.width = `${this.video.clientWidth}px`;
          this.canvas.style.height = `${this.video.clientHeight}px`;
          console.log("Canvas resized to:", {
            width: this.canvas.width,
            height: this.canvas.height,
          });
        }
      }
    });

    resizeObserver.observe(this.video);
  }

  updateTimeStats(timeInMs) {
    this.forwardTimes = [timeInMs].concat(this.forwardTimes).slice(0, 30);
    const avgTimeInMs =
      this.forwardTimes.reduce((total, t) => total + t) /
      this.forwardTimes.length;
  }

  async detectFaces() {
    if (
      !this.isModelsLoaded ||
      !this.video ||
      this.video.paused ||
      this.video.ended ||
      this.video.readyState !== 4 ||
      !this.faceMatcher
    ) {
      return;
    }

    const ts = Date.now();

    try {
      const detections = await faceapi
        .detectAllFaces(
          this.video,
          new faceapi.TinyFaceDetectorOptions({ minConfidence: 0.5 })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      this.updateTimeStats(Date.now() - ts);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (detections.length > 0) {
        const dims = faceapi.matchDimensions(this.canvas, this.video, true);
        const resizedResults = faceapi.resizeResults(detections, dims);

        resizedResults.forEach((detection) => {
          const bestMatch = this.faceMatcher.findBestMatch(
            detection.descriptor
          );

          if (this.withBoxes) {
            const box = detection.detection.box;

            const drawOptions = {
              label: `${bestMatch.label}`,
              lineWidth: 2,
              boxColor: currentBoxColor,
              drawLabelOptions: {
                fontSize: 24,
                fontStyle: "bold",
                padding: 10,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                fontColor: "white",
              },
            };
            const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
            drawBox.draw(this.canvas);
          }
        });
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }

  startDetection() {
    console.log("Starting face detection");

    const detectFrame = async () => {
      if (!document.contains(this.video) || !document.contains(this.canvas)) {
        console.log("Video or canvas removed from DOM, cleaning up...");
        this.cleanup();
        return;
      }

      await this.detectFaces();
      this.animationFrameId = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }
}
