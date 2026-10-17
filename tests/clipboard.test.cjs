const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
const flush = () => new Promise(setImmediate);

async function createPage({ local = {}, maxClips = 100, text = "Copied text", html = "" } = {}) {
  const listeners = new Map();
  const state = { clips: [], ...structuredClone(local) };
  const messages = [];
  const writes = [];
  const commands = [];
  const errors = [];
  const page = { tagName: "BODY" };
  const savedRange = {};
  const selection = {
    toString: () => text,
    rangeCount: html ? 1 : 0,
    getRangeAt: () => ({ cloneContents: () => html, cloneRange: () => savedRange }),
    removeAllRanges() { this.restoredRange = null; },
    addRange(range) { this.restoredRange = range; }
  };
  let onMessage;
  const context = vm.createContext({
    chrome: {
      storage: {
        local: {
          get: async () => structuredClone(state),
          set: async (values) => Object.assign(state, structuredClone(values))
        },
        sync: { get: async () => ({ maxClips }) },
        onChanged: { addListener() {} }
      },
      runtime: {
        onMessage: { addListener(callback) { onMessage = callback; } },
        sendMessage: async (message) => { messages.push(message); }
      }
    },
    document: {
      activeElement: page,
      addEventListener(name, callback, capture) { listeners.set(name, { callback, capture }); },
      getSelection: () => selection,
      createElement: () => ({ innerHTML: "", appendChild(fragment) { this.innerHTML += fragment; } }),
      execCommand: (...args) => { commands.push(args); return true; }
    },
    navigator: { clipboard: { writeText: async (value) => { writes.push(value); } } },
    crypto: webcrypto,
    Event,
    location: { href: "https://example.test/article" },
    console: { warn: (...args) => errors.push(args) }
  });
  const contentScripts = manifest.content_scripts.find((entry) => entry.matches.includes("<all_urls>"));
  assert.ok(contentScripts, "Capture must be registered for websites");
  for (const script of contentScripts.js) {
    vm.runInContext(readFileSync(path.join(root, script), "utf8"), context, { filename: script });
  }
  await flush();
  return {
    state, messages, writes, commands, errors, selection, savedRange, listeners,
    async emit(name, target = page) {
      const listener = listeners.get(name);
      assert.ok(listener, `Missing ${name} handler`);
      listener.callback({ target });
      await flush();
      assert.equal(errors.length, 0, "Capture must not log failures");
    },
    paste(text, options = {}) {
      let response;
      onMessage({ type: "PASTE_TEXT", text, ...options }, {}, (result) => { response = result; });
      return response;
    }
  };
}

function textControl(tagName, value, selectionStart, selectionEnd, type = "text") {
  return {
    tagName, type, value, selectionStart, selectionEnd, events: [], focused: false,
    focus() { this.focused = true; },
    setRangeText(text, start, end, mode) {
      assert.equal(mode, "end");
      this.value = this.value.slice(0, start) + text + this.value.slice(end);
      this.selectionStart = this.selectionEnd = start + text.length;
    },
    dispatchEvent(event) { this.events.push(event); }
  };
}

test("manifest keeps all website capture scripts present and ordered", () => {
  const scripts = manifest.content_scripts.flatMap((entry) => entry.js);
  assert.ok(scripts.includes("content/content.js"));
  assert.ok(scripts.indexOf("utils/constants.js") >= 0);
  assert.ok(scripts.indexOf("utils/constants.js") < scripts.indexOf("content/content.js"));
  for (const script of scripts) assert.ok(existsSync(path.join(root, script)), `Missing ${script}`);
});

test("website copy saves text, rich HTML, source and badge notification", async () => {
  const page = await createPage({ text: "Copied text", html: "<b>Copied text</b>" });
  await page.emit("copy");
  assert.equal(page.state.clips.length, 1);
  const clip = page.state.clips[0];
  assert.equal(clip.text, "Copied text");
  assert.equal(clip.html, "<b>Copied text</b>");
  assert.equal(clip.sourceUrl, "https://example.test/article");
  assert.match(clip.id, /^[0-9a-f-]{36}$/);
  assert.ok(clip.timestamp > 0);
  assert.equal(page.messages[0].type, "UPDATE_BADGE");
  assert.equal(page.listeners.get("copy").capture, true);
});

for (const tagName of ["INPUT", "TEXTAREA"]) {
  test(`${tagName} copy and paste round trip replaces the saved selection`, async () => {
    const page = await createPage({ text: "", html: "<b>unrelated selection</b>" });
    const source = textControl(tagName, "before selected after", 7, 15);
    await page.emit("copy", source);
    const clip = page.state.clips[0];
    assert.equal(clip.text, "selected");
    assert.equal(clip.html, undefined);

    const target = textControl(tagName, "replace this text", 8, 12);
    await page.emit("focusin", target);
    await page.emit("blur", target);
    target.selectionStart = target.selectionEnd = 0;
    const response = page.paste(clip.text);
    assert.equal(response.success, true);
    assert.equal(target.value, "replace selected text");
    assert.equal(target.focused, true);
    assert.equal(target.selectionStart, 16);
    assert.equal(target.events.length, 1);
    assert.equal(target.events[0].type, "input");
    assert.equal(target.events[0].bubbles, true);
  });
}

test("contenteditable paste restores the selection and supports plain and rich text", async () => {
  const page = await createPage({ html: "<b>Copied text</b>" });
  const target = { tagName: "DIV", isContentEditable: true, focus() {} };
  await page.emit("copy", target);
  await page.emit("focusin", target);
  await page.emit("blur", target);
  const clip = page.state.clips[0];
  assert.equal(page.paste(clip.text, { html: clip.html, useRich: false }).success, true);
  assert.equal(page.selection.restoredRange, page.savedRange);
  assert.deepEqual(page.commands[0], ["insertText", false, clip.text]);
  assert.equal(page.paste(clip.text, { html: clip.html, useRich: true }).success, true);
  assert.deepEqual(page.commands[1], ["insertHTML", false, clip.html]);
});

test("paste without a focused field reports failure", async () => {
  const page = await createPage();
  const response = page.paste("Copied text");
  assert.equal(response.success, false);
  assert.equal(response.reason, "no-target");
});

test("empty copies, duplicates and paused capture do not save or update the badge", async () => {
  for (const options of [
    { text: "   " },
    { local: { clips: [{ text: "Copied text" }] } },
    { local: { paused: true } }
  ]) {
    const page = await createPage(options);
    const before = structuredClone(page.state.clips);
    await page.emit("copy");
    assert.deepEqual(page.state.clips, before);
    assert.equal(page.messages.length, 0);
  }
});

test("password field copies are excluded", async () => {
  const page = await createPage({ text: "private value" });
  await page.emit("copy", textControl("INPUT", "private value", 0, 13, "password"));
  assert.equal(page.state.clips.length, 0);
  assert.equal(page.messages.length, 0);
});

test("sensitive copies are flagged with expiry unless detection is disabled", async () => {
  const page = await createPage({ text: "password=example-secret", local: { sensitiveExpiry: 5 } });
  await page.emit("copy");
  assert.equal(page.state.clips[0].sensitive, true);
  assert.ok(page.state.clips[0].expiresAt >= page.state.clips[0].timestamp + 5 * 60 * 1000);
  const disabled = await createPage({ text: "password=example-secret", local: { sensitiveDetection: false } });
  await disabled.emit("copy");
  assert.equal(disabled.state.clips[0].sensitive, undefined);
  assert.equal(disabled.state.clips[0].expiresAt, undefined);
});

test("copy respects the configured history limit", async () => {
  const page = await createPage({ maxClips: 2, local: { clips: [{ text: "old" }, { text: "older" }] } });
  await page.emit("copy");
  assert.deepEqual(page.state.clips.map((clip) => clip.text), ["Copied text", "old"]);
});

test("auto-copy writes the clipboard and stores the selection only when enabled and unpaused", async () => {
  for (const local of [{}, { autoCopy: true, paused: true }, { autoCopy: true }]) {
    const page = await createPage({ local });
    await page.emit("mouseup");
    const enabled = local.autoCopy && !local.paused;
    assert.equal(page.state.clips.length, enabled ? 1 : 0);
    assert.deepEqual(page.writes, enabled ? ["Copied text"] : []);
    assert.equal(page.messages.length, enabled ? 1 : 0);
  }
});