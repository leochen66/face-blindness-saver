document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggleSwitch");
  const status = document.getElementById("status");
  const colorButtons = document.querySelectorAll(".color-btn");

  // Initialize UI state
  function updateStatusText(isEnabled) {
    status.textContent = isEnabled ? "Detection ON" : "Detection OFF";
  }

  // Update selected color button UI
  function updateSelectedColor(color) {
    colorButtons.forEach((button) => {
      if (button.dataset.color.toLowerCase() === color.toLowerCase()) {
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
      }
    });
  }

  // Load detection status
  chrome.storage.local.get(
    "detectionEnabled",
    ({ detectionEnabled = true }) => {
      toggleSwitch.checked = detectionEnabled;
      updateStatusText(detectionEnabled);
    }
  );

  // Handle toggle switch changes
  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    updateStatusText(isEnabled);
    chrome.storage.local.set({ detectionEnabled: isEnabled });

    // Notify content script of the status change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: isEnabled ? "startDetection" : "stopDetection",
        });
      }
    });
  });

  // Load and handle color selection
  chrome.storage.sync.get("boxColor", ({ boxColor = "#FF0000" }) => {
    updateSelectedColor(boxColor);
  });

  // Handle color button clicks
  colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedColor = button.dataset.color;
      updateSelectedColor(selectedColor);

      // Save color to storage
      chrome.storage.sync.set({ boxColor: selectedColor });

      // Notify content script of the color change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateColor",
            color: selectedColor,
          });
        }
      });
    });
  });
});
