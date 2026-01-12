// ===== DOM Elements =====
const searchInput = document.getElementById("searchInput");
const newItemInput = document.getElementById("newItemInput");
const addBtn = document.getElementById("addBtn");
const itemsContainer = document.getElementById("itemsContainer");
const itemsList = document.getElementById("itemsList");
const emptyState = document.getElementById("emptyState");
const itemCount = document.getElementById("itemCount");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

// ===== State =====
let clipboardItems = [];

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadItems();
  renderItems();
  setupEventListeners();
}

// ===== Storage Functions =====
async function loadItems() {
  try {
    const result = await chrome.storage.local.get(["clipboardItems"]);
    clipboardItems = result.clipboardItems || [];
  } catch (error) {
    console.error("Error loading items:", error);
    clipboardItems = [];
  }
}

async function saveItems() {
  try {
    await chrome.storage.local.set({ clipboardItems });
  } catch (error) {
    console.error("Error saving items:", error);
    showToast("Failed to save", true);
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Add new item
  addBtn.addEventListener("click", addItem);
  newItemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addItem();
    }
  });

  // Search
  searchInput.addEventListener("input", handleSearch);

  // Handle paste in input
  newItemInput.addEventListener("paste", () => {
    // Focus stays on input after paste
    setTimeout(() => newItemInput.focus(), 0);
  });
}

// ===== Core Functions =====
function addItem() {
  const content = newItemInput.value.trim();
  if (!content) {
    showToast("Please enter some text", true);
    return;
  }

  const newItem = {
    id: Date.now().toString(),
    content: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  clipboardItems.unshift(newItem);
  saveItems();
  renderItems();
  newItemInput.value = "";
  newItemInput.focus();
  showToast("Added to vault!");
}

async function copyItem(id) {
  const item = clipboardItems.find((i) => i.id === id);
  if (!item) return;

  try {
    await navigator.clipboard.writeText(item.content);
    showToast("Copied to clipboard!");
  } catch (error) {
    console.error("Error copying:", error);
    showToast("Failed to copy", true);
  }
}

function deleteItem(id) {
  clipboardItems = clipboardItems.filter((i) => i.id !== id);
  saveItems();
  renderItems();
  showToast("Item deleted");
}

function editItem(id, newContent) {
  const item = clipboardItems.find((i) => i.id === id);
  if (!item) return;

  item.content = newContent;
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderItems();
  showToast("Item updated");
}

function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const items = document.querySelectorAll(".item");

  items.forEach((item) => {
    const text = item.querySelector(".item-text").textContent.toLowerCase();
    if (text.includes(query)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}

// ===== Render Functions =====
function renderItems() {
  itemsList.innerHTML = "";
  updateItemCount();

  if (clipboardItems.length === 0) {
    emptyState.classList.remove("hidden");
    itemsList.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  itemsList.classList.remove("hidden");

  clipboardItems.forEach((item) => {
    const li = createItemElement(item);
    itemsList.appendChild(li);
  });
}

function createItemElement(item) {
  const li = document.createElement("li");
  li.className = "item";
  li.dataset.id = item.id;

  const truncatedContent =
    item.content.length > 150
      ? item.content.substring(0, 150) + "..."
      : item.content;

  li.innerHTML = `
    <div class="item-content">
      <div class="item-text" title="Double-click to edit, click to copy">${escapeHtml(truncatedContent)}</div>
      <div class="item-actions">
        <button class="action-btn copy-btn" title="Copy to clipboard">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="Delete item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="item-meta">
      <span class="item-date">${formatDate(item.createdAt)}</span>
      <span class="item-length">${item.content.length} chars</span>
    </div>
  `;

  // Event listeners
  const textEl = li.querySelector(".item-text");
  const copyBtn = li.querySelector(".copy-btn");
  const deleteBtn = li.querySelector(".delete-btn");

  // Single click to copy
  textEl.addEventListener("click", () => copyItem(item.id));

  // Double click to edit
  textEl.addEventListener("dblclick", () => startEditing(item.id, textEl));

  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyItem(item.id);
  });

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });

  return li;
}

function startEditing(id, textEl) {
  const item = clipboardItems.find((i) => i.id === id);
  if (!item) return;

  textEl.classList.add("editing");
  textEl.contentEditable = true;
  textEl.textContent = item.content; // Show full content when editing
  textEl.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(textEl);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const finishEditing = () => {
    const newContent = textEl.textContent.trim();
    textEl.classList.remove("editing");
    textEl.contentEditable = false;

    if (newContent && newContent !== item.content) {
      editItem(id, newContent);
    } else {
      renderItems(); // Reset to truncated view
    }
  };

  textEl.addEventListener("blur", finishEditing, { once: true });
  textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textEl.blur();
    }
    if (e.key === "Escape") {
      textEl.textContent = item.content;
      textEl.blur();
    }
  });
}

function updateItemCount() {
  const count = clipboardItems.length;
  itemCount.textContent = `${count} item${count !== 1 ? "s" : ""}`;
}

// ===== Utility Functions =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function showToast(message, isError = false) {
  toastMessage.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
