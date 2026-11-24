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

/** Type path of a node, e.g. "Thing/Abstract/Event/LegalEvent/Arrest". */
function nodeType(node) {
  return (node && node.type != null) ? String(node.type) : "";
}

/** True if the node type path contains an "Event" segment. */
function isEventType(typePath) {
  return typePath.split("/").indexOf("Event") !== -1;
}

function buildVisData(raw, hiddenEdgeLabels) {
  const nodesIn = (raw && Array.isArray(raw.nodes)) ? raw.nodes : [];
  const edgesIn = (raw && Array.isArray(raw.edges)) ? raw.edges : [];

  const visNodes = nodesIn.map(function (n) {
    const formText = toDisplayText(n);
    const typePath = nodeType(n);
    const isEvent = isEventType(typePath);

    const titleLines = ["id: " + (n && n.id != null ? String(n.id) : ""), "form: " + formText];
    if (typePath) {
      titleLines.push("type: " + typePath);
    }
    if (n && n.kind != null) {
      titleLines.push("kind: " + String(n.kind));
    }
    if (n && n.depth != null) {
      titleLines.push("depth: " + String(n.depth));
    }
    if (n && n.mentionCount != null) {
      titleLines.push("mentions: " + String(n.mentionCount));
    }
    titleLines.push("properties:\n" + JSON.stringify((n && n.properties) ? n.properties : {}, null, 2));

    // vis-network renders node title as plain text (not HTML); use \n only — no <br> or escapeHtml or tags show literally.
    const titleText = titleLines.join("\n");
    var labelText = formText.length > 40 ? (formText.slice(0, 37) + "…") : formText;
    if (isEvent) {
      labelText = typePath.split("/").pop();
    }

    const visNode = {
      id: n.id,
      label: labelText,
      title: titleText,
      font: { size: 14 }
    };

    if (isEvent) {
      visNode.color = {
        background: "#c8e6c9",
        border: "#2e7d32",
        highlight: { background: "#a5d6a7", border: "#1b5e20" },
        hover: { background: "#c8e6c9", border: "#2e7d32" }
      };
    }

    // Nœuds racines (depth 0) mis en avant : fond plein foncé, texte blanc, halo doux de la même teinte.
    if (n && Number(n.depth) === 0) {
      const accent = isEvent
        ? { bg: "#2e7d32", border: "#1b5e20", hover: "#388e3c", halo: "rgba(46, 125, 50, 0.45)" }
        : { bg: "#1e63c4", border: "#174ea0", hover: "#2a72d6", halo: "rgba(30, 99, 196, 0.45)" };
      visNode.color = {
        background: accent.bg,
        border: accent.border,
        highlight: { background: accent.hover, border: accent.border },
        hover: { background: accent.hover, border: accent.border }
      };
      visNode.borderWidth = 2;
      visNode.borderWidthSelected = 3;
      visNode.font = { size: 16, color: "#ffffff" };
      visNode.margin = 12;
      visNode.shadow = { enabled: true, size: 14, x: 0, y: 0, color: accent.halo };
      visNode.mass = 2;
    }

    return visNode;
  });

  const filteredEdges = (hiddenEdgeLabels && hiddenEdgeLabels.size > 0)
    ? edgesIn.filter(function (e) {
        return !hiddenEdgeLabels.has((e && e.type != null) ? String(e.type) : "");
      })
    : edgesIn;

  // Count edges per source→target pair to spread overlapping edges
  const pairTotals = {};
  filteredEdges.forEach(function (e) {
    const key = String(e.source) + "__" + String(e.target);
    pairTotals[key] = (pairTotals[key] || 0) + 1;
  });
  const pairCursor = {};

  const visEdges = filteredEdges.map(function (e, i) {
    const edgeId = (e && e.id != null) ? String(e.id) : ("e-" + i);
    const edgeLabel = (e && e.type != null) ? String(e.type) : "";
    const key = String(e.source) + "__" + String(e.target);
    const total = pairTotals[key];
    const pos = pairCursor[key] || 0;
    pairCursor[key] = pos + 1;

    // ~7px par caractère à font-size 11, + 80px de marge pour les nœuds et la flèche
    const edgeLength = Math.max(120, edgeLabel.length * 7 + 80);

    const visEdge = {
      id: edgeId,
      from: e.source,
      to: e.target,
      label: edgeLabel,
      arrows: "to",
      font: { align: "middle", size: 11 },
      length: edgeLength
    };

    if (total > 1) {
      // t ∈ [-1, 1] : répartit les edges symétriquement autour du centre
      const t = (pos / (total - 1)) * 2 - 1;
      if (Math.abs(t) < 0.01) {
        visEdge.smooth = { type: "curvedCW", roundness: 0 };
      } else {
        visEdge.smooth = {
          type: t > 0 ? "curvedCW" : "curvedCCW",
          roundness: Math.abs(t) * 0.3 + 0.1
        };
      }
    }

    return visEdge;
  });

  return { nodes: visNodes, edges: visEdges };
}

function setError(errorEl, message) {
  errorEl.textContent = message || "";
}

/** Overlay de chargement affiché au-dessus du graphe. */
function createLoader(loaderEl, textEl) {
  function setText(text) {
    if (textEl) {
      textEl.textContent = text;
    }
  }
  return {
    show: function (text) {
      setText(text || "Chargement du graphe…");
      if (loaderEl) {
        loaderEl.hidden = false;
      }
    },
    progress: function (done, total) {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      setText("Calcul de la disposition… " + pct + " %");
    },
    hide: function () {
      if (loaderEl) {
        loaderEl.hidden = true;
      }
    }
  };
}

function render(editorEl, errorEl, containerEl, currentNetwork, hiddenEdgeLabels, loader) {
  let parsed;
  try {
    parsed = JSON.parse(editorEl.value);
  } catch (err) {
    setError(errorEl, "JSON invalide : " + (err && err.message ? err.message : String(err)));
    loader.hide();
    return currentNetwork;
  }

  setError(errorEl, "");
  const data = buildVisData(parsed, hiddenEdgeLabels || new Set());
  const options = {
    layout: { improvedLayout: true },
    physics: {
      enabled: true,
      solver: "barnesHut",
      barnesHut: {
        gravitationalConstant: -8000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 1
      },
      stabilization: { iterations: 300 }
    },
    nodes: { margin: 10 },
    edges: { smooth: { type: "cubicBezier" } },
    interaction: { hover: true, tooltipDelay: 120 }
  };

  if (currentNetwork) {
    currentNetwork.destroy();
  }
  let network;
  try {
    network = new vis.Network(containerEl, data, options);
  } catch (err) {
    setError(errorEl, "Erreur de rendu : " + (err && err.message ? err.message : String(err)));
    loader.hide();
    return null;
  }
  network.on("stabilizationProgress", function (params) {
    loader.progress(params.iterations, params.total);
  });
  network.once("stabilized", loader.hide);
  network.on("stabilizationIterationsDone", function () {
    loader.hide();
    network.setOptions({ physics: { enabled: false } });
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
  });
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

const SAMPLE_GRAPH_URL = "./sample.json";

function emptyGraphFallback() {
  return { nodes: [], edges: [] };
}

document.addEventListener("DOMContentLoaded", function () {
  syncFooterVersionFromMeta();

  const editorEl = document.getElementById("editor");
  const errorEl = document.getElementById("error");
  const containerEl = document.getElementById("container");
  const btnEl = document.getElementById("btnRender");
  const mainEl = document.querySelector(".main");
  const sidebarEl = document.querySelector(".sidebar");
  const splitterEl = document.querySelector(".splitter");
  const filterSmallEl = document.getElementById("filterContextSmall");
  const filterLargeEl = document.getElementById("filterContextLarge");
  const btnThemeEl = document.getElementById("btnTheme");

  // Theme
  function applyTheme(dark) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    if (btnThemeEl) {
      btnThemeEl.setAttribute("aria-label", dark ? "Passer en mode clair" : "Passer en mode sombre");
    }
    try { window.localStorage.setItem("prevyo.theme", dark ? "dark" : "light"); } catch (_) {}
  }
  const savedTheme = (function () { try { return window.localStorage.getItem("prevyo.theme"); } catch (_) { return null; } }());
  applyTheme(savedTheme === "dark");
  if (btnThemeEl) {
    btnThemeEl.addEventListener("click", function () {
      applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
    });
  }

  if (mainEl && sidebarEl && splitterEl) {
    setupSplitter(mainEl, sidebarEl, splitterEl);
  }

  function getHiddenEdgeLabels() {
    const hidden = new Set();
    if (filterSmallEl && filterSmallEl.checked) { hidden.add("ContextSmall"); }
    if (filterLargeEl && filterLargeEl.checked) { hidden.add("ContextLarge"); }
    return hidden;
  }

  const loader = createLoader(document.getElementById("loader"), document.getElementById("loaderText"));
  let network = null;
  let renderToken = 0;

  // Affiche le loader puis laisse le navigateur le peindre avant le calcul (bloquant) du layout.
  function scheduleRender() {
    renderToken += 1;
    const token = renderToken;
    loader.show();
    requestAnimationFrame(function () {
      setTimeout(function () {
        if (token !== renderToken) {
          return;
        }
        network = render(editorEl, errorEl, containerEl, network, getHiddenEdgeLabels(), loader);
      }, 0);
    });
  }

  btnEl.addEventListener("click", scheduleRender);

  function onFilterChange() {
    scheduleRender();
  }
  if (filterSmallEl) { filterSmallEl.addEventListener("change", onFilterChange); }
  if (filterLargeEl) { filterLargeEl.addEventListener("change", onFilterChange); }

  loader.show("Chargement de sample.json…");
  fetch(SAMPLE_GRAPH_URL)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      editorEl.value = JSON.stringify(data, null, 2);
      setError(errorEl, "");
      scheduleRender();
    })
    .catch(function (err) {
      editorEl.value = JSON.stringify(emptyGraphFallback(), null, 2);
      setError(errorEl, "Impossible de charger sample.json : " + (err && err.message ? err.message : String(err)));
      scheduleRender();
    });
});

