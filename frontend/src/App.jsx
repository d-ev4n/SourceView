
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  useNodesInitialized,
  useNodesState,
  BaseEdge,
  EdgeLabelRenderer,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./App.css";
import AuthPage from "./AuthPage";

// ==========================================
// CONFIGURATION
// ==========================================

const API = "http://127.0.0.1:8001";

const MIN_HEIGHT = 250;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 400;

const NODE_WIDTH = 190;
const NODE_HEIGHT = 64;

// ==========================================
// RELATIONSHIP EXPLANATIONS
// ==========================================

const RELATIONSHIP_HELP = [
  {
    value: "related",
    title: "Related",
    meaning:
      "Both sources discuss a similar subject.",
    example:
      "Two websites explain Python programming basics.",
  },
  {
    value: "supports",
    title: "Supports",
    meaning:
      "The first source provides evidence supporting a claim in the second source.",
    example:
      "A research paper supports a statement in your study notes.",
  },
  {
    value: "contradicts",
    title: "Contradicts",
    meaning:
      "Two sources disagree about a specific claim.",
    example:
      "Two research studies report conflicting results.",
  },
  {
    value: "expands",
    title: "Expands",
    meaning:
      "The first source provides more information about a topic discussed in the second source.",
    example:
      "A detailed Python tutorial expands a short Python overview.",
  },
];

// ==========================================
// CUSTOM NODE
// ==========================================

function SourceNode({ data }) {
  const dark = data.theme === "dark";

  return (
    <div
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        boxSizing: "border-box",
        padding: "14px 16px",
        borderRadius: 8,
        border: dark
          ? "1px solid #55585e"
          : "1px solid #c5c8cc",
        background: dark
          ? "#1c1d20"
          : "#ffffff",
        color: dark
          ? "#eeeeef"
          : "#22252a",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        overflowWrap: "anywhere",
        userSelect: "none",
        cursor: data.locked
          ? "default"
          : "grab",
      }}
    >
      <Handle
        type="target"
        id="left-target"
        position={Position.Left}
        isConnectable={!data.locked}
        style={{
          top: "40%",
          width: 10,
          height: 10,
          background: "#aaaaaa",
        }}
      />

      <Handle
        type="source"
        id="left-source"
        position={Position.Left}
        isConnectable={!data.locked}
        style={{
          top: "65%",
          width: 9,
          height: 9,
          background: "#aaaaaa",
        }}
      />

      {data.title}

      <Handle
        type="target"
        id="right-target"
        position={Position.Right}
        isConnectable={!data.locked}
        style={{
          top: "65%",
          width: 9,
          height: 9,
          background: "#eeeeee",
        }}
      />

      <Handle
        type="source"
        id="right-source"
        position={Position.Right}
        isConnectable={!data.locked}
        style={{
          top: "40%",
          width: 10,
          height: 10,
          background: "#eeeeee",
        }}
      />
    </div>
  );
}

const nodeTypes = {
  sourceNode: SourceNode,
};

// ==========================================
// RELATIONSHIP EDGE
// ==========================================

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
}) {
  const lane = Number(data?.lane || 0);

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  const distance = Math.max(
    Math.sqrt(dx * dx + dy * dy),
    1
  );

  const direction = data?.reverse ? -1 : 1;

  const perpendicularX =
    (-dy / distance) * direction;

  const perpendicularY =
    (dx / distance) * direction;

  const curveOffset = lane * 110;

  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  const middleX =
    centerX + perpendicularX * curveOffset;

  const middleY =
    centerY + perpendicularY * curveOffset;

  const controlX =
    2 * middleX - centerX;

  const controlY =
    2 * middleY - centerY;

  const path = `
    M ${sourceX},${sourceY}
    Q ${controlX},${controlY}
    ${targetX},${targetY}
  `;

  const labelOffset = lane * 55;

  const labelX =
    middleX + perpendicularX * labelOffset;

  const labelY =
    middleY + perpendicularY * labelOffset;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={style}
        markerEnd={markerEnd}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            padding: "4px 8px",
            borderRadius: 6,
            border: data?.dark
              ? "1px solid #484b52"
              : "1px solid #dddddd",
            background: data?.dark
              ? "#1c1d20"
              : "#ffffff",
            color: data?.dark
              ? "#eeeeef"
              : "#22252a",
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          {data?.label || "related"}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = {
  relationship: RelationshipEdge,
};

// ==========================================
// POSITION HELPERS
// ==========================================

function validPosition(position) {
  return (
    position &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Math.abs(position.x) < 50000 &&
    Math.abs(position.y) < 50000
  );
}

function layoutPosition(index, width) {
  const cellWidth = 300;
  const cellHeight = 155;

  const columns = Math.max(
    1,
    Math.floor(
      (Math.max(330, width) - 70) /
        cellWidth
    )
  );

  const gridWidth =
    columns * NODE_WIDTH +
    (columns - 1) * 110;

  const startX = Math.max(
    45,
    (width - gridWidth) / 2
  );

  return {
    x:
      startX +
      (index % columns) * cellWidth,
    y:
      55 +
      Math.floor(index / columns) *
        cellHeight,
  };
}

// ==========================================
// FIT GRAPH WHEN READY
// ==========================================

function FitGraphOnReady({
  count,
  version,
  flowRef,
}) {
  const flow = useReactFlow();
  const initialized = useNodesInitialized();
  const fittedRef = useRef(null);

  useEffect(() => {
    flowRef.current = flow;
  }, [flow, flowRef]);

  useEffect(() => {
    if (
      !initialized ||
      count === 0 ||
      fittedRef.current === version
    ) {
      return;
    }

    fittedRef.current = version;

    const frame = requestAnimationFrame(() => {
      flow.fitView({
        padding: 0.35,
        duration: 0,
        minZoom: 0.15,
        maxZoom: 1,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    initialized,
    count,
    version,
    flow,
  ]);

  return null;
}

// ==========================================
// KNOWLEDGE GRAPH
// ==========================================

function KnowledgeGraph({
  sources,
  connections,
  theme,
  graphHeight,
  graphLocked,
  nodePositions,
  setNodePositions,
  onConnect,
}) {
  const containerRef = useRef(null);
  const flowRef = useRef(null);

  const savedPositionsRef = useRef(
    nodePositions
  );

  const [width, setWidth] = useState(850);
  const [fitVersion, setFitVersion] =
    useState(0);

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState([]);

  // ========================================
  // SAVED POSITIONS
  // ========================================

  useEffect(() => {
    savedPositionsRef.current =
      nodePositions;
  }, [nodePositions]);

  // ========================================
  // MEASURE GRAPH
  // ========================================

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    const updateWidth = () => {
      setWidth(element.clientWidth || 850);
    };

    updateWidth();

    if (
      typeof ResizeObserver === "undefined"
    ) {
      window.addEventListener(
        "resize",
        updateWidth
      );

      return () =>
        window.removeEventListener(
          "resize",
          updateWidth
        );
    }

    const observer = new ResizeObserver(
      updateWidth
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // ========================================
  // SOURCE IDS
  // ========================================

  const sourceVersion = useMemo(
    () =>
      sources
        .map((source) => String(source.id))
        .sort()
        .join(","),
    [sources]
  );

  // ========================================
  // SYNCHRONIZE SOURCES
  // ========================================

  useEffect(() => {
    setNodes((previous) => {
      const existing = new Map(
        previous.map((node) => [
          node.id,
          node,
        ])
      );

      return sources.map(
        (source, index) => {
          const id = String(source.id);
          const old = existing.get(id);

          const position =
            old?.position ||
            (
              validPosition(
                savedPositionsRef.current[id]
              )
                ? savedPositionsRef.current[id]
                : layoutPosition(index, width)
            );

          return {
            ...(old || {}),
            id,
            type: "sourceNode",
            position,

            draggable: !graphLocked,
            selectable: true,
            connectable: !graphLocked,
            selected: false,

            style: {
              pointerEvents: "all",
            },

            data: {
              title: source.title,
              theme,
              locked: graphLocked,
            },
          };
        }
      );
    });
  }, [
    sources,
    sourceVersion,
    width,
    theme,
    graphLocked,
    setNodes,
  ]);

  // ========================================
  // INDEPENDENT NODE DRAGGING
  // ========================================

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // ========================================
  // SAVE DRAGGED NODE POSITION
  // ========================================

  const handleNodeDragStop = useCallback(
    (_event, node) => {
      const id = String(node.id);

      const position = {
        x: node.position.x,
        y: node.position.y,
      };

      setNodePositions((previous) => ({
        ...previous,
        [id]: position,
      }));
    },
    [setNodePositions]
  );

  // ========================================
  // RESET LAYOUT
  // ========================================

  const resetLayout = useCallback(() => {
    const positions = {};

    sources.forEach((source, index) => {
      positions[String(source.id)] =
        layoutPosition(index, width);
    });

    setNodes((previous) =>
      previous.map((node) => ({
        ...node,
        position:
          positions[node.id] ||
          node.position,
        selected: false,
      }))
    );

    setNodePositions((previous) => ({
      ...previous,
      ...positions,
    }));

    setFitVersion(
      (value) => value + 1
    );
  }, [
    sources,
    width,
    setNodes,
    setNodePositions,
  ]);

  // ========================================
  // FIT VIEW
  // ========================================

  const fitView = useCallback(() => {
    flowRef.current?.fitView({
      padding: 0.35,
      duration: 250,
      minZoom: 0.15,
      maxZoom: 1,
    });
  }, []);

  // ========================================
  // RELATIONSHIP EDGES
  // ========================================

  const edges = useMemo(() => {
    const ids = new Set(
      sources.map((source) =>
        String(source.id)
      )
    );

    const positions = new Map(
      nodes.map((node) => [
        node.id,
        node.position,
      ])
    );

    const visible = connections.filter(
      (connection) =>
        ids.has(
          String(connection.source_id)
        ) &&
        ids.has(
          String(connection.target_id)
        )
    );

    const groups = new Map();

    visible.forEach((connection) => {
      const key = [
        String(connection.source_id),
        String(connection.target_id),
      ]
        .sort()
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(
        String(connection.id)
      );
    });

    const color =
      theme === "dark"
        ? "#cbd1d9"
        : "#424750";

    return visible.map((connection) => {
      const source = String(
        connection.source_id
      );

      const target = String(
        connection.target_id
      );

      const pair = [
        source,
        target,
      ].sort();

      const group = groups.get(
        pair.join("|")
      );

      const orderedGroup = [...group].sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            { numeric: true }
          )
      );

      const lane =
        orderedGroup.indexOf(
          String(connection.id)
        ) -
        (orderedGroup.length - 1) / 2;

      const sourcePosition =
        positions.get(source);

      const targetPosition =
        positions.get(target);

      const goesRight =
        !sourcePosition ||
        !targetPosition ||
        sourcePosition.x <=
          targetPosition.x;

      return {
        id: String(connection.id),
        source,
        target,

        sourceHandle: goesRight
          ? "right-source"
          : "left-source",

        targetHandle: goesRight
          ? "left-target"
          : "right-target",

        type: "relationship",

        data: {
          label:
            connection.relationship_type ||
            "related",
          dark: theme === "dark",
          lane,
          reverse: source !== pair[0],
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },

        style: {
          stroke: color,
          strokeWidth: 1.8,
        },
      };
    });
  }, [
    sources,
    connections,
    theme,
    nodes,
  ]);

  // ========================================
  // GRAPH INTERFACE
  // ========================================

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 9,
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          className="theme-toggle"
          onClick={resetLayout}
        >
          ↺ Reset Layout
        </button>

        <button
          type="button"
          className="theme-toggle"
          onClick={fitView}
        >
          ⛶ Fit View
        </button>

        <small style={{ opacity: 0.7 }}>
          {nodes.length} nodes · Drag each node
          with the left mouse button
        </small>
      </div>

      <div
        ref={containerRef}
        className="graph"
        style={{
          height: graphHeight,
          minHeight: graphHeight,
          maxHeight: graphHeight,
          width: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}

            onNodesChange={
              handleNodesChange
            }

            onNodeDragStop={
              handleNodeDragStop
            }

            onConnect={onConnect}

            onInit={(flow) => {
              flowRef.current = flow;
            }}

            nodesDraggable={!graphLocked}
            elementsSelectable={true}

            multiSelectionKeyCode={null}
            selectionOnDrag={false}
            selectNodesOnDrag={false}

            panOnDrag={false}
            nodesConnectable={!graphLocked}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            zoomOnPinch={!graphLocked}

            autoPanOnNodeDrag={false}
            autoPanOnConnect={false}

            nodesFocusable={false}
            edgesFocusable={false}

            fitView={false}

            defaultViewport={{
              x: 0,
              y: 0,
              zoom: 1,
            }}

            minZoom={0.1}
            maxZoom={2}
            colorMode={theme}
          >
            <Background
              color={
                theme === "dark"
                  ? "#303236"
                  : "#e1e2e3"
              }
              gap={20}
              size={1}
            />

            <Controls
              showInteractive={false}
            />

            <MiniMap
              nodeColor={
                theme === "dark"
                  ? "#c4c6c8"
                  : "#55585e"
              }
              maskColor={
                theme === "dark"
                  ? "#111214aa"
                  : "#ffffffaa"
              }
              style={{
                width: 105,
                height: 62,
              }}
              pannable={false}
              zoomable={false}
            />

            <FitGraphOnReady
              count={nodes.length}
              version={`${sourceVersion}:${fitVersion}`}
              flowRef={flowRef}
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APPLICATION
// ==========================================

export default function App() {
  // ========================================
  // AUTHENTICATION
  // ========================================

  const [token, setToken] = useState(
    () =>
      sessionStorage.getItem(
        "sourceview-token"
      ) || ""
  );

  const [username, setUsername] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(true);

  // ========================================
  // RESEARCH DATA
  // ========================================

  const [sources, setSources] =
    useState([]);

  const [connections, setConnections] =
    useState([]);

  // ========================================
  // SOURCE FORM
  // ========================================

  const [title, setTitle] =
    useState("");

  const [url, setUrl] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [sourceType, setSourceType] =
    useState("article");

  // ========================================
  // RELATIONSHIP FORM
  // ========================================

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [relation, setRelation] =
    useState("related");

  const [
    showRelationshipHelp,
    setShowRelationshipHelp,
  ] = useState(false);

  // ========================================
  // SEARCH AND SETTINGS
  // ========================================

  const [search, setSearch] =
    useState("");

  const [filterType, setFilterType] =
    useState("all");

  const [message, setMessage] =
    useState("");

  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(
        "sourceview-theme"
      ) || "dark"
  );

  const isDark = theme === "dark";

  const [graphLocked, setGraphLocked] =
    useState(false);

  const [graphHeight, setGraphHeight] =
    useState(() => {
      const saved = Number(
        localStorage.getItem(
          "sourceview-graph-height"
        )
      );

      return saved
        ? Math.max(
            MIN_HEIGHT,
            Math.min(MAX_HEIGHT, saved)
          )
        : DEFAULT_HEIGHT;
    });

  const [nodePositions, setNodePositions] =
    useState({});

  const [positionsReady, setPositionsReady] =
    useState(false);

  const positionKey = username
    ? `sourceview-node-positions-${username}`
    : null;

  // ========================================
  // SAVE PREFERENCES
  // ========================================

  useEffect(() => {
    localStorage.setItem(
      "sourceview-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "sourceview-graph-height",
      String(graphHeight)
    );
  }, [graphHeight]);

  // ========================================
  // NODE POSITION STORAGE
  // ========================================

  useEffect(() => {
    if (!positionKey) {
      setNodePositions({});
      setPositionsReady(false);
      return;
    }

    setPositionsReady(false);

    try {
      const saved = JSON.parse(
        localStorage.getItem(positionKey) ||
          "{}"
      );

      setNodePositions(
        saved &&
          typeof saved === "object" &&
          !Array.isArray(saved)
          ? saved
          : {}
      );
    } catch {
      setNodePositions({});
    }

    setPositionsReady(true);
  }, [positionKey]);

  useEffect(() => {
    if (
      !positionKey ||
      !positionsReady
    ) {
      return;
    }

    localStorage.setItem(
      positionKey,
      JSON.stringify(nodePositions)
    );
  }, [
    positionKey,
    positionsReady,
    nodePositions,
  ]);

  // ========================================
  // AUTHENTICATION
  // ========================================

  const logout = useCallback(() => {
    sessionStorage.removeItem(
      "sourceview-token"
    );

    setToken("");
    setUsername("");
    setSources([]);
    setConnections([]);
    setSearch("");
    setFilterType("all");
    setMessage("");
    setGraphLocked(false);
    setNodePositions({});
    setPositionsReady(false);
  }, []);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = new Headers(
        options.headers || {}
      );

      if (token) {
        headers.set(
          "Authorization",
          `Bearer ${token}`
        );
      }

      const response = await fetch(
        `${API}${path}`,
        {
          ...options,
          headers,
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();

        throw new Error(
          "Session expired. Please log in again."
        );
      }

      return response;
    },
    [token, logout]
  );

  function handleLogin(
    newToken,
    newUsername
  ) {
    sessionStorage.setItem(
      "sourceview-token",
      newToken
    );

    setToken(newToken);
    setUsername(newUsername);
    setMessage("");
  }

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);

      try {
        const response = await fetch(
          `${API}/auth/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Invalid session"
          );
        }

        const user =
          await response.json();

        if (!cancelled) {
          setUsername(user.username);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  // ========================================
  // LOAD DATA
  // ========================================

  const loadData = useCallback(
    async () => {
      if (!token) return;

      try {
        const [
          sourceResponse,
          connectionResponse,
        ] = await Promise.all([
          apiFetch("/sources"),
          apiFetch("/connections"),
        ]);

        if (
          !sourceResponse.ok ||
          !connectionResponse.ok
        ) {
          throw new Error(
            "Failed to load research data."
          );
        }

        setSources(
          await sourceResponse.json()
        );

        setConnections(
          await connectionResponse.json()
        );
      } catch (error) {
        setMessage(error.message);
      }
    },
    [token, apiFetch]
  );

  useEffect(() => {
    if (token && !authLoading) {
      loadData();
    }
  }, [
    token,
    authLoading,
    loadData,
  ]);

  // ========================================
  // ADD SOURCE
  // ========================================

  async function addSource(event) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage(
        "Please enter a source title."
      );
      return;
    }

    try {
      const response = await apiFetch(
        "/sources",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            url: url.trim(),
            description:
              description.trim(),
            source_type: sourceType,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to add source."
        );
      }

      setTitle("");
      setUrl("");
      setDescription("");
      setSourceType("article");

      await loadData();

      setMessage(
        "Source added successfully."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ========================================
  // EDIT SOURCE
  // ========================================

  async function editSource(source) {
    const newTitle = window.prompt(
      "Edit source title:",
      source.title
    );

    if (newTitle === null) return;

    if (!newTitle.trim()) {
      setMessage(
        "Source title cannot be empty."
      );
      return;
    }

    const newUrl = window.prompt(
      "Edit source URL:",
      source.url || ""
    );

    if (newUrl === null) return;

    const newDescription =
      window.prompt(
        "Edit source description:",
        source.description || ""
      );

    if (newDescription === null) {
      return;
    }

    try {
      const response = await apiFetch(
        `/sources/${source.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: newTitle.trim(),
            url: newUrl.trim(),
            description:
              newDescription.trim(),
            source_type:
              source.source_type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update source."
        );
      }

      await loadData();

      setMessage(
        "Source updated successfully."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ========================================
  // DELETE SOURCE
  // ========================================

  async function deleteSource(id) {
    if (
      !window.confirm(
        "Delete this source?"
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(
        `/sources/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete source."
        );
      }

      setNodePositions((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[String(id)];

        return updated;
      });

      await loadData();

      setMessage(
        "Source deleted successfully."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ========================================
  // CREATE RELATIONSHIP
  // ========================================

  async function saveConnection(
    sourceId,
    targetId,
    type
  ) {
    if (!sourceId || !targetId) {
      setMessage(
        "Please select two sources."
      );
      return false;
    }

    if (
      String(sourceId) ===
      String(targetId)
    ) {
      setMessage(
        "A source cannot connect to itself."
      );
      return false;
    }

    const exists = connections.some(
      (connection) =>
        String(
          connection.source_id
        ) === String(sourceId) &&
        String(
          connection.target_id
        ) === String(targetId) &&
        connection.relationship_type ===
          type
    );

    if (exists) {
      setMessage(
        "This relationship already exists."
      );
      return false;
    }

    try {
      const response = await apiFetch(
        "/connections",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            source_id:
              Number(sourceId),
            target_id:
              Number(targetId),
            relationship_type: type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create relationship."
        );
      }

      await loadData();

      setMessage(
        "Relationship created successfully."
      );

      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function addConnection(event) {
    event.preventDefault();

    const success =
      await saveConnection(
        from,
        to,
        relation
      );

    if (success) {
      setFrom("");
      setTo("");
      setRelation("related");
    }
  }

  async function handleGraphConnect(
    params
  ) {
    if (graphLocked) return;

    await saveConnection(
      params.source,
      params.target,
      "related"
    );
  }

  // ========================================
  // DELETE RELATIONSHIP
  // ========================================

  async function deleteConnection(id) {
    if (
      !window.confirm(
        "Delete this relationship?"
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(
        `/connections/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete relationship."
        );
      }

      await loadData();

      setMessage(
        "Relationship deleted successfully."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filteredSources = useMemo(
    () => {
      const query =
        search.toLowerCase().trim();

      return sources.filter(
        (source) => {
          const matchesSearch =
            source.title
              .toLowerCase()
              .includes(query) ||
            (source.description || "")
              .toLowerCase()
              .includes(query) ||
            (source.url || "")
              .toLowerCase()
              .includes(query);

          const matchesType =
            filterType === "all" ||
            source.source_type ===
              filterType;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    },
    [
      sources,
      search,
      filterType,
    ]
  );

  const filteredConnections = useMemo(
    () => {
      const ids = new Set(
        filteredSources.map(
          (source) =>
            String(source.id)
        )
      );

      return connections.filter(
        (connection) =>
          ids.has(
            String(
              connection.source_id
            )
          ) &&
          ids.has(
            String(
              connection.target_id
            )
          )
      );
    },
    [
      connections,
      filteredSources,
    ]
  );

  function getSourceName(id) {
    const source = sources.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

    return source
      ? source.title
      : `Source ${id}`;
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111214",
          color: "#eeeeef",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Loading SourceView...
      </div>
    );
  }

  // ========================================
  // LOGIN SCREEN
  // ========================================

  if (!token) {
    return (
      <AuthPage
        onLogin={handleLogin}
      />
    );
  }

  // ========================================
  // DASHBOARD
  // ========================================

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div>
          <h1>SourceView</h1>

          <p>
            Visual Research &amp;
            Knowledge Management
          </p>
        </div>

        <div className="header-actions">
          <span className="status">
            {username ||
              "Research Workspace"}
          </span>

          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme(
                (current) =>
                  current === "dark"
                    ? "light"
                    : "dark"
              )
            }
          >
            {isDark
              ? "☀ Light Mode"
              : "☾ Dark Mode"}
          </button>

          <button
            type="button"
            className="theme-toggle"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="layout">
        {/* SIDEBAR */}

        <aside className="sidebar">
          {/* ADD RESEARCH SOURCE */}

          <section className="panel">
            <h2>
              Add Research Source
            </h2>

            <form onSubmit={addSource}>
              <input
                type="text"
                placeholder="Source title"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                required
              />

              <input
                type="url"
                placeholder="Source URL (optional)"
                value={url}
                onChange={(event) =>
                  setUrl(
                    event.target.value
                  )
                }
              />

              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
              />

              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(
                    event.target.value
                  )
                }
              >
                <option value="article">
                  Article
                </option>

                <option value="website">
                  Website
                </option>

                <option value="paper">
                  Research Paper
                </option>

                <option value="note">
                  Note
                </option>
              </select>

              <button type="submit">
                + Add Source
              </button>
            </form>
          </section>

          {/* CREATE RELATIONSHIP */}

          <section className="panel">
            <h2>
              Create Relationship
            </h2>

            <form onSubmit={addConnection}>
              <select
                value={from}
                onChange={(event) =>
                  setFrom(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select first source
                </option>

                {sources.map(
                  (source) => (
                    <option
                      key={source.id}
                      value={source.id}
                    >
                      {source.title}
                    </option>
                  )
                )}
              </select>

              <select
                value={to}
                onChange={(event) =>
                  setTo(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select second source
                </option>

                {sources.map(
                  (source) => (
                    <option
                      key={source.id}
                      value={source.id}
                    >
                      {source.title}
                    </option>
                  )
                )}
              </select>

              <select
                value={relation}
                onChange={(event) =>
                  setRelation(
                    event.target.value
                  )
                }
              >
                <option value="related">
                  Related
                </option>

                <option value="supports">
                  Supports
                </option>

                <option value="contradicts">
                  Contradicts
                </option>

                <option value="expands">
                  Expands
                </option>
              </select>

              {/* ==================================
                  RELATIONSHIP HELP GUIDE
                  ================================== */}

              <div
                style={{
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowRelationshipHelp(
                      (current) => !current
                    )
                  }
                  aria-expanded={
                    showRelationshipHelp
                  }
                  aria-controls="relationship-help"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    background: "transparent",
                    border: "none",
                    padding: "8px 0",
                    color: isDark
                      ? "#cbd5e1"
                      : "#475569",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 17,
                      }}
                    >
                      🔗
                    </span>

                    What do these relationships mean?
                  </span>

                  <span aria-hidden="true">
                    {showRelationshipHelp
                      ? "▲"
                      : "▼"}
                  </span>
                </button>

                {showRelationshipHelp && (
                  <div
                    id="relationship-help"
                    style={{
                      marginTop: 8,
                      padding: 14,
                      borderRadius: 8,

                      // ONLY NEW FIX:
                      // Limit the help guide's height.
                      maxHeight: "250px",
                      overflowY: "auto",
                      overscrollBehavior: "contain",

                      border: isDark
                        ? "1px solid #393c43"
                        : "1px solid #d1d5db",
                      background: isDark
                        ? "#23252a"
                        : "#f8fafc",
                      color: isDark
                        ? "#eeeeef"
                        : "#1f2937",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      Relationship Guide
                    </div>

                    {RELATIONSHIP_HELP.map(
                      (item, index) => (
                        <div
                          key={item.value}
                          style={{
                            marginBottom:
                              index ===
                              RELATIONSHIP_HELP.length - 1
                                ? 0
                                : 13,
                          }}
                        >
                          <strong>
                            {item.title}
                          </strong>

                          <p
                            style={{
                              margin: "3px 0 5px",
                            }}
                          >
                            {item.meaning}
                          </p>

                          <p
                            style={{
                              margin: 0,
                              opacity: 0.8,
                            }}
                          >
                            <strong>
                              Example:
                            </strong>{" "}
                            {item.example}
                          </p>
                        </div>
                      )
                    )}

                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: isDark
                          ? "1px solid #393c43"
                          : "1px solid #d1d5db",
                        opacity: 0.8,
                      }}
                    >
                      Tip: Read both sources
                      before choosing a relationship.
                      The arrow goes from the first
                      source to the second.
                    </div>
                  </div>
                )}
              </div>

              {/* END RELATIONSHIP HELP */}

              <button
                type="submit"
                disabled={
                  sources.length < 2
                }
              >
                + Connect Sources
              </button>
            </form>
          </section>

          {message && (
            <p className="message">
              {message}
            </p>
          )}
        </aside>

        {/* WORKSPACE */}

        <section className="workspace">
          <div className="workspace-title">
            <div>
              <h2>
                Knowledge Graph
              </h2>

              <p>
                Search, connect, and explore
                research relationships
              </p>
            </div>

            <span>
              {filteredSources.length}
              {" / "}
              {sources.length}
              {" Sources"}
            </span>
          </div>

          {/* SEARCH */}

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <input
              type="search"
              placeholder="Search sources..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              style={{
                flex: "1 1 220px",
              }}
            />

            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(
                  event.target.value
                )
              }
              style={{
                flex: "0 1 170px",
              }}
            >
              <option value="all">
                All Types
              </option>

              <option value="article">
                Articles
              </option>

              <option value="website">
                Websites
              </option>

              <option value="paper">
                Research Papers
              </option>

              <option value="note">
                Notes
              </option>
            </select>

            <button
              type="button"
              className="theme-toggle"
              onClick={() => {
                setSearch("");
                setFilterType("all");
              }}
            >
              Clear
            </button>
          </div>

          {/* GRAPH HEIGHT CONTROLS */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
              padding: 12,
              border: isDark
                ? "1px solid #303236"
                : "1px solid #dddddd",
              borderRadius: 8,
              background: isDark
                ? "#1c1d20"
                : "#ffffff",
              color: isDark
                ? "#eeeeef"
                : "#292b2f",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Graph Height
            </span>

            <button
              type="button"
              className="theme-toggle"
              disabled={
                graphHeight <= MIN_HEIGHT
              }
              onClick={() =>
                setGraphHeight(
                  (current) =>
                    Math.max(
                      MIN_HEIGHT,
                      current - 50
                    )
                )
              }
            >
              −
            </button>

            <input
              type="range"
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              step="50"
              value={graphHeight}
              onChange={(event) =>
                setGraphHeight(
                  Number(
                    event.target.value
                  )
                )
              }
              style={{
                width: 180,
                cursor: "pointer",
              }}
            />

            <button
              type="button"
              className="theme-toggle"
              disabled={
                graphHeight >= MAX_HEIGHT
              }
              onClick={() =>
                setGraphHeight(
                  (current) =>
                    Math.min(
                      MAX_HEIGHT,
                      current + 50
                    )
                )
              }
            >
              +
            </button>

            <span
              style={{
                fontSize: 12,
              }}
            >
              {graphHeight}px
            </span>

            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setGraphHeight(
                  DEFAULT_HEIGHT
                )
              }
            >
              ↺ Reset Size
            </button>

            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setGraphLocked(
                  (current) => !current
                )
              }
            >
              {graphLocked
                ? "Unlock Nodes"
                : "Lock Nodes"}
            </button>
          </div>

          {/* KNOWLEDGE GRAPH */}

          {positionsReady && (
            <KnowledgeGraph
              sources={filteredSources}
              connections={
                filteredConnections
              }
              theme={theme}
              graphHeight={
                graphHeight
              }
              graphLocked={
                graphLocked
              }
              nodePositions={
                nodePositions
              }
              setNodePositions={
                setNodePositions
              }
              onConnect={
                handleGraphConnect
              }
            />
          )}

          <p
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: 8,
            }}
          >
            Left-click and drag one node
            to move it independently.
            Other nodes stay still.
            Use Reset Layout to arrange
            nodes and Fit View to center them.
          </p>

          {/* RESEARCH LISTS */}

          <div className="bottom-panels">
            <section className="panel">
              <h2>
                Research Sources
              </h2>

              {filteredSources.length ===
                0 && (
                <p className="muted">
                  No matching research
                  sources found.
                </p>
              )}

              {filteredSources.map(
                (source) => (
                  <div
                    className="list-item"
                    key={source.id}
                  >
                    <div>
                      <strong>
                        {source.title}
                      </strong>

                      <small>
                        {source.source_type}
                      </small>

                      {source.description && (
                        <small>
                          {
                            source.description
                          }
                        </small>
                      )}

                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open Source
                        </a>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          editSource(
                            source
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          deleteSource(
                            source.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </section>

            <section className="panel">
              <h2>
                Relationships
              </h2>

              {filteredConnections.length ===
                0 && (
                <p className="muted">
                  No matching relationships
                  found.
                </p>
              )}

              {filteredConnections.map(
                (connection) => (
                  <div
                    className="list-item"
                    key={
                      connection.id
                    }
                  >
                    <div>
                      <strong>
                        {getSourceName(
                          connection.source_id
                        )}
                      </strong>

                      <small>
                        {
                          connection.relationship_type
                        }
                        {" → "}
                        {getSourceName(
                          connection.target_id
                        )}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        deleteConnection(
                          connection.id
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
