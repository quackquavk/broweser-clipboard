// ===== DOM Elements =====
const searchInput = document.getElementById("searchInput");
const newItemTitle = document.getElementById("newItemTitle");
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

  // Keyboard shortcuts
  newItemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addItem();
    }
  });

  newItemTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      newItemInput.focus();
    }
  });

  // Search
  searchInput.addEventListener("input", handleSearch);
}

// ===== Core Functions =====
function addItem() {
  const title = newItemTitle.value.trim();
  const content = newItemInput.value.trim();

  if (!title) {
    showToast("Please enter a title", true);
    newItemTitle.focus();
    return;
  }

  if (!content) {
    showToast("Please enter some content", true);
    newItemInput.focus();
    return;
  }

  const newItem = {
    id: Date.now().toString(),
    title: title,
    content: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  clipboardItems.unshift(newItem);
  saveItems();
  renderItems();
  newItemTitle.value = "";
  newItemInput.value = "";
  newItemTitle.focus();
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

function toggleExpand(id) {
  const itemEl = document.querySelector(`.item[data-id="${id}"]`);
  if (itemEl) {
    itemEl.classList.toggle("expanded");
  }
}

function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const items = document.querySelectorAll(".item");

  items.forEach((item) => {
    const title = item.querySelector(".item-title").textContent.toLowerCase();
    const content =
      item.querySelector(".item-content-text")?.textContent.toLowerCase() || "";
    if (title.includes(query) || content.includes(query)) {
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

  li.innerHTML = `
    <div class="item-header">
      <svg class="item-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="item-title">${escapeHtml(item.title)}</span>
      <svg class="item-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="item-body">
      <div class="item-content-text">${escapeHtml(item.content)}</div>
      <div class="item-actions">
        <button class="action-btn copy-btn" title="Copy to clipboard">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
          Copy
        </button>
        <button class="action-btn delete-btn" title="Delete item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Delete
        </button>
      </div>
      <div class="item-meta">
        <span class="item-date">${formatDate(item.createdAt)}</span>
        <span class="item-length">${item.content.length} chars</span>
      </div>
    </div>
  `;

  // Event listeners
  const header = li.querySelector(".item-header");
  const copyBtn = li.querySelector(".copy-btn");
  const deleteBtn = li.querySelector(".delete-btn");

  // Click header to expand/collapse
  header.addEventListener("click", () => toggleExpand(item.id));

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
