document.addEventListener("DOMContentLoaded", async () => {
  const settings = await browser.storage.local.get([
    "apiKey",
    "openrouterModel",
    "ollamaUrl",
    "ollamaModel"
  ]);

  if (settings.apiKey) document.getElementById("apiKey").value = settings.apiKey;
  if (settings.openrouterModel) document.getElementById("openrouterModel").value = settings.openrouterModel;
  if (settings.ollamaUrl) document.getElementById("ollamaUrl").value = settings.ollamaUrl;
  if (settings.ollamaModel) document.getElementById("ollamaModel").value = settings.ollamaModel;
});

document.getElementById("save").addEventListener("click", async () => {
  const apiKey = document.getElementById("apiKey").value.trim();
  const openrouterModel = document.getElementById("openrouterModel").value.trim() || "google/gemini-3.8-flash";
  const ollamaUrl = document.getElementById("ollamaUrl").value.trim().replace(/\/+$/, "") || "http://localhost:11434";
  const ollamaModel = document.getElementById("ollamaModel").value.trim();
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("status");

  const dataToSave = {
    apiKey,
    openrouterModel,
    ollamaUrl,
    ollamaModel
  };

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    dataToSave.contextText = await file.text();
  }

  await browser.storage.local.set(dataToSave);
  status.textContent = "Settings saved successfully.";
  setTimeout(() => (status.textContent = ""), 2500);
});