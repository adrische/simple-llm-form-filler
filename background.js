// Register a single context menu entry
browser.runtime.onInstalled.addListener(() => {
  browser.menus.create({
    id: "fill-input-llm",
    title: "Generate Answer with LLM",
    contexts: ["editable"]
  });
});

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "fill-input-llm") return;

  try {
    // 1. Get the query/label from the active field
    const response = await browser.tabs.sendMessage(tab.id, { action: "GET_INPUT_QUERY" });
    if (!response || !response.query) {
      console.warn("Could not find a label or question for this field.");
      return;
    }

    // 2. Fetch user settings
    const settings = await browser.storage.local.get([
      "apiKey",
      "openrouterModel",
      "ollamaUrl",
      "ollamaModel",
      "contextText"
    ]);

    const hasOllama = Boolean(settings.ollamaModel && settings.ollamaModel.trim());
    const hasOpenRouter = Boolean(settings.apiKey && settings.apiKey.trim());

    if (!hasOllama && !hasOpenRouter) {
      throw new Error("No provider configured. Enter an Ollama model or OpenRouter API key in settings.");
    }

    // 3. Build messages array
    const messages = [];
    if (settings.contextText) {
      messages.push({
        role: "system",
        content: `Use the following context to answer form inputs accurately:\n\n${settings.contextText}`
      });
    }
    messages.push({
      role: "user",
      content: `Please provide a direct, concise response to fill into a form field with this label/question: "${response.query}". Output only the answer itself without conversational filler.`
    });

    let outputText = "";

    // 4. Priority Routing: Ollama first, OpenRouter fallback
    if (hasOllama) {
      const baseUrl = (settings.ollamaUrl && settings.ollamaUrl.trim().replace(/\/+$/, "")) || "http://localhost:11434";
      const model = settings.ollamaModel.trim();

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: false
        })
      });

      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      outputText = data.message?.content?.trim() || "";

    } else {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://addons.mozilla.org",
          "X-Title": "Simple LLM Form Filler"
        },
        body: JSON.stringify({
          model: settings.openrouterModel?.trim() || "openrouter/google/gemini-3.8-flash",
          messages: messages
        })
      });

      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      outputText = data.choices?.[0]?.message?.content?.trim() || "";
    }

    // 5. Insert text into the active field
    await browser.tabs.sendMessage(tab.id, {
      action: "INSERT_TEXT",
      text: outputText
    });

  } catch (err) {
    console.error("LLM Fill Error:", err);
    await browser.tabs.sendMessage(tab.id, {
      action: "INSERT_TEXT",
      text: `[Error: ${err.message}]`
    });
  }
});