let lastTarget = null;

// Track the right-clicked element
document.addEventListener("contextmenu", (event) => {
  lastTarget = event.target;
}, true);

// Extract the query/label associated with the target
function extractLabel(el) {
  if (el.value && el.value.trim().length > 0) {
    return el.value.trim();
  }
  if (el.labels && el.labels.length > 0) {
    return el.labels[0].innerText.trim();
  }
  const parentLabel = el.closest("label");
  if (parentLabel) {
    return parentLabel.innerText.trim();
  }
  if (el.getAttribute("aria-label")) {
    return el.getAttribute("aria-label").trim();
  }
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.innerText.trim();
  }
  if (el.placeholder) return el.placeholder.trim();
  if (el.name) return el.name.trim();

  const prev = el.previousElementSibling;
  if (prev && prev.innerText) {
    return prev.innerText.trim();
  }
  return "";
}

// Modern text insertion replacing deprecated execCommand
function insertTextIntoElement(target, text) {
  target.focus();

  // 1. Standard HTML Form Inputs & Textareas
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    try {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;

      // Replaces selection or inserts at caret; 'end' moves the cursor after insertion
      target.setRangeText(text, start, end, "end");
    } catch {
      // Fallback for input types that disallow selection ranges (e.g. type="number")
      target.value = text;
    }

    // Trigger synthetic input events so reactive frameworks (React, Vue) sync state
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  // 2. Rich-text editors (contenteditable)
  if (target.isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move caret position immediately following the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      target.innerText = text;
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // 3. Fallback for generic elements
  target.textContent = text;
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

// Listener for background messages
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "GET_INPUT_QUERY") {
    if (!lastTarget) return { error: "No input targeted." };
    return { query: extractLabel(lastTarget) };
  }

  if (msg.action === "INSERT_TEXT") {
    if (!lastTarget) return;
    insertTextIntoElement(lastTarget, msg.text);
  }
});