# YouTube Face Blindness Saver

<img src="https://imgur.com/CEAjyzh.png" alt="Local Development Screenshot" width="100%"/>

### 🎯 Enhance Your YouTube Experience with AI-Powered Face Recognition

YouTube Face Blindness Saver is an innovative Chrome extension that brings real-time face detection and recognition technology to your YouTube viewing experience. Using a lightweight machine learning model, this extension helps you identify familiar faces while watching your favorite YouTube content.

## 🌟 Features

- **Real-Time Face Detection**: Advanced AI technology detects faces as you watch, providing seamless recognition without interrupting your viewing experience.
- **Instant Face Recognition**: Automatically identifies and labels recognized faces in your videos using a sophisticated face-matching system.
- **Friendly UI**: Ability to change frame colors and switch the detection on/off.
- **Lightweight**: Minimal impact on your browsing experience.

<div style="display: flex; justify-content: space-between;">
    <img src="https://i.imgur.com/hCuJZF1.png" alt="Demo Screenshot 1" width="45%"/>
    <img src="https://i.imgur.com/HZofYMs.png" alt="Demo Screenshot 2" width="45%"/>
</div>

## 🚀 Quick Demo

1. Install the demo version on [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-face-blindness-sa/daomlfmcnaaeckhcfcgfgiiablicpcnp)
2. Open your favorite "Friends" TV show episode on YouTube

![hippo](https://imgur.com/Gy3DqQu.gif)

**Note**: This demo version focuses specifically on the "Friends" dataset.

## 🛠️ Code Overview

There are two parts in this project:

- Google Chrome Extension
- Training Script

The training-script trains the face recognition model that the Google Chrome extension needs.

<img src="https://i.imgur.com/pHPMhc3.png" alt="Local Development Screenshot" width="80%"/>

## 💻 How to Run Source Code Locally

Follow the steps in this guide: [Debugging Google Chrome Extensions Locally](https://medium.com/@leochen6687/debugging-google-chrome-extensions-locally-a-quick-easy-guide-b9f55ed14cbd)

**Note**: A pretrained model on "Friends" dataset is provided in `extension/model/face_recognition.json`

## 🏋️‍♂️ How to Train on Customized Face Dataset

### Step 1:

Put your dataset in folder `training-script/data/raw`

### Step 2:

```bash
git clone https://github.com/leochen66/face-blindness-saver.git
cd face-blindness-saver/training-script
npm install
npm run pipline
```

The pipeline will run data-preprocessing, training, and evaluation.

### Step 3:

The model will be saved in `training-script/model/face-recognition`. Copy this model to folder `extension/model/face-recognition` and the extension will apply this model.

## 📂 Dataset

Celebrity face image dataset is generated from this repository:

- [Celebrity Face Dataset](https://github.com/leochen66/celebrity-face-dataset)

Download celebrity face image dataset on Kaggle:

- [Download Dataset](https://www.kaggle.com/datasets/leochen66/celebrity-face-dataset)

## 🤝 Contribution

Feel free to make a PR. I will review ASAP.

## Need Help?

Feel free to post tickets on [GitHub Issues](https://github.com/leochen66/face-blindness-saver/issues)
If you have any suggestions, please feel free to contact me at leochen6687@gmail.com
