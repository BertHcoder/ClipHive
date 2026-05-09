// Listen for copy events on the page and forward to background
document.addEventListener("copy", () => {
  const selection = document.getSelection();
  if (!selection) return;

  const text = selection.toString();
  if (!text || !text.trim()) return;

  chrome.runtime.sendMessage({
    type: "NEW_CLIP",
    text: text,
    sourceUrl: location.href
  });
});
