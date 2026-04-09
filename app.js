/* global vis */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toDisplayText(node) {
  if (node && node.form != null) {
    return String(node.form);
  }
  if (node && node.id != null) {
    return String(node.id);
  }
  return "";
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

    const safeTitle = escapeHtml(titleLines.join("\n")).replaceAll("\n", "<br>");
    const safeForm = escapeHtml(form);
    const label = safeForm.length > 40 ? (safeForm.slice(0, 37) + "…") : safeForm;

    return {
      id: n.id,
      label: label,
      title: safeTitle,
      font: { size: 14 }
    };
  });

  const visEdges = edgesIn.map(function (e, i) {
    const edgeId = (e && e.id != null) ? String(e.id) : ("e-" + i);
    const edgeLabel = (e && e.type != null) ? escapeHtml(String(e.type)) : "";

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
  return new vis.Network(containerEl, data, options);
}

document.addEventListener("DOMContentLoaded", function () {
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

  editorEl.value = JSON.stringify(defaultJson, null, 2);

  let network = null;
  btnEl.addEventListener("click", function () {
    network = render(editorEl, errorEl, containerEl, network);
  });

  network = render(editorEl, errorEl, containerEl, network);
});

