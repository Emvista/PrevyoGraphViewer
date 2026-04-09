/* global vis */

function toDisplayText(node) {
  if (node && node.form != null) {
    return String(node.form);
  }
  if (node && node.id != null) {
    return String(node.id);
  }
  return "";
}

/** True if any entry in labels[] contains the substring "Event" (e.g. Thing/Abstract/Event/Attack). */
function labelsContainEvent(labelsArr) {
  if (!Array.isArray(labelsArr)) {
    return false;
  }
  let i = 0;
  for (i = 0; i < labelsArr.length; i += 1) {
    if (String(labelsArr[i]).indexOf("Event") !== -1) {
      return true;
    }
  }
  return false;
}

function buildVisData(raw) {
  const nodesIn = (raw && Array.isArray(raw.nodes)) ? raw.nodes : [];
  const edgesIn = (raw && Array.isArray(raw.edges)) ? raw.edges : [];

  const visNodes = nodesIn.map(function (n) {
    const form = toDisplayText(n);
    const labels = Array.isArray(n.labels) ? n.labels.join("\n") : "";

    const titleLines = ["id: " + (n && n.id != null ? String(n.id) : ""), "form: " + form];
    if (labels) {
      titleLines.push("labels: " + labels);
    }
    titleLines.push("properties: " + JSON.stringify((n && n.properties) ? n.properties : {}, null, 0));

    // vis-network renders node title as plain text (not HTML); use \n only — no <br> or escapeHtml or tags show literally.
    const titleText = titleLines.join("\n");
    const labelText = form.length > 40 ? (form.slice(0, 37) + "…") : form;

    const visNode = {
      id: n.id,
      label: labelText,
      title: titleText,
      font: { size: 14 }
    };

    if (labelsContainEvent(n.labels)) {
      visNode.color = {
        background: "#c8e6c9",
        border: "#2e7d32",
        highlight: { background: "#a5d6a7", border: "#1b5e20" },
        hover: { background: "#c8e6c9", border: "#2e7d32" }
      };
    }

    return visNode;
  });

  const visEdges = edgesIn.map(function (e, i) {
    const edgeId = (e && e.id != null) ? String(e.id) : ("e-" + i);
    const edgeLabel = (e && e.type != null) ? String(e.type) : "";

    return {
      id: edgeId,
      from: e.source,
      to: e.target,
      label: edgeLabel,
      arrows: "to",
      font: { align: "middle", size: 11 }
    };
  });

  return { nodes: visNodes, edges: visEdges };
}

function setError(errorEl, message) {
  errorEl.textContent = message || "";
}

function render(editorEl, errorEl, containerEl, currentNetwork) {
  let parsed;
  try {
    parsed = JSON.parse(editorEl.value);
  } catch (err) {
    setError(errorEl, "JSON invalide : " + (err && err.message ? err.message : String(err)));
    return currentNetwork;
  }

  setError(errorEl, "");
  const data = buildVisData(parsed);
  const options = {
    layout: { improvedLayout: true },
    physics: {
      enabled: true,
      stabilization: { iterations: 200 }
    },
    edges: { smooth: { type: "cubicBezier" } },
    interaction: { hover: true, tooltipDelay: 120 }
  };

  if (currentNetwork) {
    currentNetwork.destroy();
  }
  const network = new vis.Network(containerEl, data, options);
  // Safari may lay out the flex pane after first paint; defer fit so vis gets real container size.
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (typeof network.fit === "function") {
          network.fit({ animation: false });
        }
      });
    });
  }
  return network;
}

function clampNumber(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function applySidebarWidth(sidebarEl, mainEl, widthPx) {
  const mainRect = mainEl.getBoundingClientRect();
  const minWidth = 240;
  const maxWidth = Math.max(minWidth, Math.floor(mainRect.width * 0.7));
  const clamped = clampNumber(Math.floor(widthPx), minWidth, maxWidth);

  sidebarEl.style.flexBasis = clamped + "px";
  sidebarEl.style.maxWidth = "none";
  sidebarEl.style.width = clamped + "px";

  try {
    window.localStorage.setItem("prevyo.sidebarWidthPx", String(clamped));
  } catch (_) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

function setupSplitter(mainEl, sidebarEl, splitterEl) {
  let dragging = false;
  let pointerId = null;

  function setDragging(nextDragging) {
    dragging = nextDragging;
    splitterEl.classList.toggle("is-dragging", dragging);
    document.body.style.cursor = dragging ? "col-resize" : "";
    document.body.style.userSelect = dragging ? "none" : "";
  }

  function widthFromClientX(clientX) {
    const rect = mainEl.getBoundingClientRect();
    return clientX - rect.left;
  }

  function onPointerDown(ev) {
    if (!ev.isPrimary) {
      return;
    }
    pointerId = ev.pointerId;
    splitterEl.setPointerCapture(pointerId);
    setDragging(true);
    applySidebarWidth(sidebarEl, mainEl, widthFromClientX(ev.clientX));
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!dragging) {
      return;
    }
    if (pointerId !== ev.pointerId) {
      return;
    }
    applySidebarWidth(sidebarEl, mainEl, widthFromClientX(ev.clientX));
    ev.preventDefault();
  }

  function endDrag() {
    if (!dragging) {
      return;
    }
    setDragging(false);
    pointerId = null;
  }

  splitterEl.addEventListener("pointerdown", onPointerDown);
  splitterEl.addEventListener("pointermove", onPointerMove);
  splitterEl.addEventListener("pointerup", endDrag);
  splitterEl.addEventListener("pointercancel", endDrag);
  splitterEl.addEventListener("lostpointercapture", endDrag);

  splitterEl.addEventListener("keydown", function (ev) {
    const step = ev.shiftKey ? 40 : 16;
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") {
      return;
    }

    const currentBasis = Number.parseInt(sidebarEl.style.flexBasis || "380", 10);
    const next = ev.key === "ArrowLeft" ? (currentBasis - step) : (currentBasis + step);
    applySidebarWidth(sidebarEl, mainEl, next);
    ev.preventDefault();
  });

  try {
    const saved = window.localStorage.getItem("prevyo.sidebarWidthPx");
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (Number.isFinite(parsed)) {
        applySidebarWidth(sidebarEl, mainEl, parsed);
      }
    }
  } catch (_) {
    // Ignore storage errors
  }
}

function syncFooterVersionFromMeta() {
  const meta = document.querySelector('meta[name="application-version"]');
  const footerEl = document.querySelector("[data-version-footer]");
  if (!meta || !footerEl) {
    return;
  }
  const v = meta.getAttribute("content");
  if (!v) {
    return;
  }
  footerEl.textContent = "version " + v;
  footerEl.setAttribute("title", "Application version " + v);
}

document.addEventListener("DOMContentLoaded", function () {
  syncFooterVersionFromMeta();

  const defaultJson = {
    nodes: [
      { id: "612375318", form: "attaqué", startOffset: 29, endOffset: 36, labels: ["Thing/Abstract/Event/Attack"], properties: { mood: "PART", aspect: "PERFORMANCE", category: "DEFENSE", tense: "PAST", polarity: "POS" } },
      { id: "f239d6bf6fec7240c6320e1c34d0b9a206b84398aa04620e4efee05d47d80db1", form: "Bill Gates", startOffset: 0, endOffset: 10, labels: ["Thing/Concrete/Animate/Livingbeing/Human/Civilian"], properties: { gender: "masculine" } },
      { id: "1737079599", form: "2024-03-12T00:00", startOffset: -1, endOffset: -1, labels: ["Thing/Abstract/Time"], properties: { timestamp: [2024, 3, 12, 0, 0, 0, 0] } },
      { id: "211366945", form: "et", startOffset: 43, endOffset: 45, labels: ["Thing"], properties: {} },
      { id: "2116738172", form: "et", startOffset: 11, endOffset: 13, labels: ["Thing"], properties: { mood: "EMPTY", aspect: "EMPTY", category: "GENERAL", tense: "EMPTY", polarity: "POS" } },
      { id: "13e6eb6defb785391d03650104542640fd10e96cda7a3f91dd89a841e6945d74", form: "Steve Jobs", startOffset: 14, endOffset: 24, labels: ["Thing/Concrete/Animate/Livingbeing/Human/Civilian"], properties: { gender: "masculine" } },
      { id: "9600d18c6c05c1c919c41cb4e55a98122c7056c86aa4027a34dc23b5af07c12f", form: "Paris", startOffset: 37, endOffset: 42, labels: ["Thing/Abstract/Location/Place"], properties: { latitude: 48.8588897, longitude: 2.320041 } },
      { id: "11d7b17889d89c56b99f58bc5f28b4e5bf779209b0291ffa6f34a96b333c59b9", form: "Londre", startOffset: 46, endOffset: 52, labels: ["Thing/Abstract/Location/Place"], properties: { latitude: 51.5074456, longitude: -0.1277653 } }
    ],
    edges: [
      { id: "0", type: "Agent", source: "612375318", target: "f239d6bf6fec7240c6320e1c34d0b9a206b84398aa04620e4efee05d47d80db1", properties: {} },
      { id: "1", type: "Time", source: "612375318", target: "1737079599", properties: {} },
      { id: "2", type: "Location", source: "612375318", target: "211366945", properties: {} },
      { id: "3", type: "Addition", source: "2116738172", target: "f239d6bf6fec7240c6320e1c34d0b9a206b84398aa04620e4efee05d47d80db1", properties: {} },
      { id: "4", type: "Addition", source: "2116738172", target: "13e6eb6defb785391d03650104542640fd10e96cda7a3f91dd89a841e6945d74", properties: {} },
      { id: "5", type: "ArgumentIn", source: "2116738172", target: "13e6eb6defb785391d03650104542640fd10e96cda7a3f91dd89a841e6945d74", properties: {} },
      { id: "6", type: "Addition", source: "211366945", target: "9600d18c6c05c1c919c41cb4e55a98122c7056c86aa4027a34dc23b5af07c12f", properties: {} },
      { id: "7", type: "Addition", source: "211366945", target: "11d7b17889d89c56b99f58bc5f28b4e5bf779209b0291ffa6f34a96b333c59b9", properties: {} }
    ]
  };

  const editorEl = document.getElementById("editor");
  const errorEl = document.getElementById("error");
  const containerEl = document.getElementById("container");
  const btnEl = document.getElementById("btnRender");
  const mainEl = document.querySelector(".main");
  const sidebarEl = document.querySelector(".sidebar");
  const splitterEl = document.querySelector(".splitter");

  editorEl.value = JSON.stringify(defaultJson, null, 2);

  if (mainEl && sidebarEl && splitterEl) {
    setupSplitter(mainEl, sidebarEl, splitterEl);
  }

  let network = null;
  btnEl.addEventListener("click", function () {
    network = render(editorEl, errorEl, containerEl, network);
  });

  network = render(editorEl, errorEl, containerEl, network);
});

