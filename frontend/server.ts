import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Google Gen AI lazily
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// In-Memory Database (mocking persistent stores)
let catalog = [
  {
    id: "comp-1",
    name: "AMD Ryzen 7 7800X3D",
    sku: "AMD-R7-7800X3D",
    price: 1650,
    category: "CPU" as const,
    icon: "developer_board",
    stock: 45,
    lastUpdated: "Today, 09:41 AM"
  },
  {
    id: "comp-2",
    name: "AMD Ryzen 9 7950X3D",
    sku: "PR-R9-7950X3D",
    price: 2450,
    category: "CPU" as const,
    icon: "developer_board",
    stock: 12,
    lastUpdated: "Today, 09:41 AM"
  },
  {
    id: "comp-3",
    name: "Intel Core i7-14700K",
    sku: "INT-I7-14700K",
    price: 1850,
    category: "CPU" as const,
    icon: "developer_board",
    stock: 24,
    lastUpdated: "Today, 10:15 AM"
  },
  {
    id: "comp-4",
    name: "Corsair Vengeance 32GB DDR5-6000",
    sku: "CR-VG-32G-6000",
    price: 520,
    category: "RAM" as const,
    icon: "memory",
    stock: 80,
    lastUpdated: "Yesterday"
  },
  {
    id: "comp-5",
    name: "Samsung 990 PRO 2TB NVMe SSD",
    sku: "SM-990P-2TB",
    price: 850,
    category: "Storage" as const,
    icon: "hard_drive",
    stock: 60,
    lastUpdated: "Yesterday"
  },
  {
    id: "comp-6",
    name: "G.Skill Trident Z5 Neo 64GB DDR5-6000",
    sku: "GS-TZ5-64G-6000",
    price: 1150,
    category: "RAM" as const,
    icon: "memory",
    stock: 18,
    lastUpdated: "Oct 24, 2023"
  },
  {
    id: "comp-7",
    name: "Corsair RM850e 850W",
    sku: "CR-RM850E",
    price: 620,
    category: "PSU" as const,
    icon: "power",
    stock: 28,
    lastUpdated: "Oct 22, 2023"
  },
  {
    id: "comp-8",
    name: "Corsair RM850x Gold Modular PSU",
    sku: "CR-RM850X",
    price: 650,
    category: "PSU" as const,
    icon: "power",
    stock: 19,
    lastUpdated: "Oct 20, 2023"
  },
  {
    id: "comp-9",
    name: "Lian Li Galahad II Trinity 360",
    sku: "LL-GA2-360",
    price: 680,
    category: "Cooling" as const,
    icon: "ac_unit",
    stock: 45,
    lastUpdated: "Oct 10, 2023"
  },
  {
    id: "comp-10",
    name: "NVIDIA GeForce RTX 4070 Super 12GB",
    sku: "NV-RTX-4070S",
    price: 3150,
    category: "GPU" as const,
    icon: "videogame_asset",
    stock: 15,
    lastUpdated: "Yesterday"
  },
  {
    id: "comp-11",
    name: "MSI B650 Tomahawk WiFi",
    sku: "MSI-B650-TOMA",
    price: 950,
    category: "Motherboard" as const,
    icon: "domain",
    stock: 35,
    lastUpdated: "Oct 01, 2023"
  },
  {
    id: "comp-12",
    name: "ASUS ROG Strix X670E-E Gaming",
    sku: "AS-ROG-X670E",
    price: 2100,
    category: "Motherboard" as const,
    icon: "domain",
    stock: 12,
    lastUpdated: "Oct 22, 2023"
  },
  {
    id: "comp-13",
    name: "Noctua NH-D15 chromax.black",
    sku: "NOCT-NH-D15",
    price: 480,
    category: "Cooling" as const,
    icon: "ac_unit",
    stock: 25,
    lastUpdated: "Oct 12, 2023"
  },
  {
    id: "comp-14",
    name: "AMD Ryzen Threadripper 7970X",
    sku: "AMD-TR-7970X",
    price: 7499,
    category: "CPU" as const,
    icon: "developer_board",
    stock: 8,
    lastUpdated: "Oct 24, 2023"
  },
  {
    id: "comp-15",
    name: "NVIDIA GeForce RTX 4090 24GB",
    sku: "NV-RTX-4090",
    price: 8200,
    category: "GPU" as const,
    icon: "videogame_asset",
    stock: 4,
    lastUpdated: "Oct 24, 2023"
  },
  {
    id: "comp-16",
    name: "Crucial T700 1TB Gen5 SSD",
    sku: "CR-T700-1TB",
    price: 920,
    category: "Storage" as const,
    icon: "hard_drive",
    stock: 8,
    lastUpdated: "Oct 24, 2023"
  }
];

let quotes = [
  {
    id: "q-1",
    date: "Oct 24, 2023",
    customer: "Acme Corp",
    brief: "Q4 Workstation Upgrade",
    total: 12450.00,
    status: "Approved" as const,
    items: [
      { component: catalog[1], quantity: 1, rationale: "Base controller workstation" },
      { component: catalog[3], quantity: 1, rationale: "Sufficient performance for office administration tasks" }
    ],
    targetBudget: 15000,
    project: "High-Performance Workstations Upgrade",
    contactNumber: "+1 (555) 234-5678",
    supportEmail: "it@acmecorp.com",
    address: "789 Corporate Blvd, New York, NY 10001",
    quotePrefix: "ACM"
  },
  {
    id: "q-2",
    date: "Oct 22, 2023",
    customer: "Globex Inc",
    brief: "Server Rack Expansion",
    total: 8920.00,
    status: "Draft" as const,
    items: [
      { component: catalog[6], quantity: 1, rationale: "High reliability system" }
    ],
    targetBudget: 10000,
    project: "Datacenter Rack-4 Expansion",
    contactNumber: "+1 (555) 987-6543",
    supportEmail: "infrastructure@globex.com",
    address: "1 Infinite Loop, Cupertino, CA 95014",
    quotePrefix: "GLB"
  },
  {
    id: "q-3",
    date: "Oct 19, 2023",
    customer: "Initech",
    brief: "Office Networking",
    total: 3100.00,
    status: "Sent" as const,
    items: [
      { component: catalog[11], quantity: 2, rationale: "Provides primary gigabit link for team workstations" }
    ],
    targetBudget: 5000,
    project: "Office Gigabit Uplink",
    contactNumber: "+1 (555) 444-2222",
    supportEmail: "billing@initech.com",
    address: "4120 Freemont Ave, Austin, TX 78701",
    quotePrefix: "INI"
  },
  {
    id: "q-4",
    date: "Oct 15, 2023",
    customer: "Soylent Corp",
    brief: "Industrial Sensors",
    total: 45000.00,
    status: "Declined" as const,
    items: [
      { component: catalog[9], quantity: 100, rationale: "High batch setup" }
    ],
    targetBudget: 40000,
    project: "Sensing Array V2",
    contactNumber: "+1 (555) 321-7654",
    supportEmail: "procurement@soylent.com",
    address: "100 Industrial Parkway, Metropolis, NY 10001",
    quotePrefix: "SOY"
  }
];

let workspaceSettings = {
  companyName: "TechRigs Distribution Sdn Bhd",
  contactNumber: "+60 3-2142 0000",
  supportEmail: "quotes@techrigs.com.my",
  businessAddress: "Level 3, Plaza Low Yat, Bukit Bintang, 55100 Kuala Lumpur.",
  customQuotePrefix: "TRD"
};

// API Routes

// Catalog Endpoints
app.get("/api/catalog", (req, res) => {
  res.json(catalog);
});

app.post("/api/catalog", (req, res) => {
  const item = req.body;
  if (!item.name || !item.sku || !item.price || !item.category) {
    return res.status(400).json({ error: "Missing required catalog item parameters" });
  }

  const existingIndex = catalog.findIndex((c) => c.sku === item.sku);
  if (existingIndex > -1) {
    catalog[existingIndex] = {
      ...catalog[existingIndex],
      ...item,
      price: Number(item.price),
      stock: Number(item.stock || 0),
      lastUpdated: "Just now"
    };
    res.json(catalog[existingIndex]);
  } else {
    const newItem = {
      id: `comp-${catalog.length + 1}`,
      name: item.name,
      sku: item.sku,
      price: Number(item.price),
      category: item.category,
      icon: item.icon || "layers",
      stock: Number(item.stock || 0),
      lastUpdated: "Just now"
    };
    catalog.push(newItem);
    res.json(newItem);
  }
});

// Settings Endpoints
app.get("/api/settings", (req, res) => {
  res.json(workspaceSettings);
});

app.post("/api/settings", (req, res) => {
  workspaceSettings = {
    ...workspaceSettings,
    ...req.body
  };
  res.json(workspaceSettings);
});

// Quotes Endpoints
app.get("/api/quotes", (req, res) => {
  res.json(quotes);
});

app.post("/api/quotes/create", (req, res) => {
  const quote = req.body;
  const newQuote = {
    id: `q-${quotes.length + 1}`,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    customer: quote.customer || "Neural Nexus Corp",
    brief: quote.brief || "Custom AI Workstation Build",
    total: Number(quote.total || 0),
    status: (quote.status || "Draft") as any,
    items: quote.items || [],
    targetBudget: Number(quote.targetBudget || 0),
    project: quote.project || "Enterprise AI Workstation",
    contactNumber: quote.contactNumber || workspaceSettings.contactNumber,
    supportEmail: quote.supportEmail || workspaceSettings.supportEmail,
    address: quote.address || "67 Innovation Way, Austin, TX 78701",
    quotePrefix: workspaceSettings.customQuotePrefix
  };
  quotes.unshift(newQuote); // Put most recent at top
  res.json(newQuote);
});

app.post("/api/quotes/generate", async (req, res) => {
  const { prompt, budget } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompt requirements provided." });
  }

  const numericBudget = Number(budget) || 0;

  // Let's first format a fallback rules-based response which works immediately without AI
  const fallbackItemsList = [
    {
      componentId: "comp-1", // Neural Engine Unit X-90
      quantity: 1,
      rationale: "Optimal for high-speed local mathematical computations and deep-learning models."
    },
    {
      componentId: "comp-4", // HyperDDR6 Module 64GB
      quantity: 1,
      rationale: "Provides essential high-bandwidth channel memory, completely mitigating host bottlenecking."
    },
    {
      componentId: "comp-7", // Industrial Flux Converter
      quantity: 1,
      rationale: "Sustains clean power with extra headroom for heavy compute cycles."
    }
  ];

  let aiProjectName = "AI-Optimized Workstation";

  const ai = getAIClient();
  if (ai) {
    try {
      const catalogContext = catalog.map(c => `[ID: "${c.id}", Name: "${c.name}", SKU: "${c.sku}", Cost: $${c.price}, Category: "${c.category}"]`).join("\n");

      const systemPrompt = `You are the Componentry AI CPQ Engine, an expert system engineer.
Analyze the user's requirements and select the best matching parts from our product catalog.

Our catalog products are:
${catalogContext}

Rule:
1. ONLY select products from the provided catalog context using their exact 'id'.
2. Balance technical suitability with target budget (Budget limit constraints: $${numericBudget || "Any"}).
3. Write highly professional, specific, personalized, 1-sentence engineering explanation/AI Rationale for each part.
4. Output your design response in JSON conforming strictly to the provided schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              project: {
                type: Type.STRING,
                description: "Optimized technical project name for this custom build (e.g., 'Enterprise AI Workstation', 'Compact 4K Editing Rig')"
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    componentId: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    rationale: { type: Type.STRING }
                  },
                  required: ["componentId", "quantity", "rationale"]
                }
              }
            },
            required: ["project", "items"]
          }
        }
      });

      const textOutput = response.text || "";
      const generated = JSON.parse(textOutput.trim());

      // Validate the items actually map to catalog items
      const finalItems = (generated.items || []).map((gi: any) => {
        const found = catalog.find(c => c.id === gi.componentId || c.sku === gi.componentId);
        if (found) {
          return {
            component: found,
            quantity: Number(gi.quantity) || 1,
            rationale: gi.rationale || "Recommended for load optimization."
          };
        }
        return null;
      }).filter(Boolean);

      if (finalItems.length > 0) {
        let totalSum = finalItems.reduce((acc: number, cur: any) => acc + (cur.component.price * cur.quantity), 0);
        return res.json({
          project: generated.project || aiProjectName,
          items: finalItems,
          total: totalSum
        });
      }
    } catch (e) {
      console.error("Gemini Generation failed, returning rules-based fallback.", e);
    }
  }

  // Rules-based smart fallback generator if AI misses or isn't enabled
  let matchedItems = [...fallbackItemsList];
  const normalized = prompt.toLowerCase();

  // Match special keywords
  if (normalized.includes("threadripper") || normalized.includes("video") || normalized.includes("render") || normalized.includes("blender")) {
    aiProjectName = "Enterprise Render Workstation";
    matchedItems = [
      {
        componentId: "comp-14", // AMD Ryzen Threadripper PRO 5995WX
        quantity: 1,
        rationale: "High thread-count matches parallel heavy rendering workloads in Blender and Maya seamlessly."
      },
      {
        componentId: "comp-15", // NVIDIA RTX 6000 Ada
        quantity: 4,
        rationale: "Multiple high-speed units provide massive local VRAM pool ideal for render farm simulation."
      },
      {
        componentId: "comp-6", // Samsung LRDIMM
        quantity: 8,
        rationale: "Large system memory size matches multi-GPU dataset caching requirements perfectly."
      },
      {
        componentId: "comp-16", // Micron 9400 PRO
        quantity: 2,
        rationale: "High endurance NVMe write speeds critical for massive scratch disk workspace allocations."
      },
      {
        componentId: "comp-8", // Supermicro Chassis
        quantity: 1,
        rationale: "Robust space configuration secures stable airflow and heat dissipation for four active load units."
      }
    ];
  } else if (normalized.includes("quantum") || normalized.includes("data") || normalized.includes("sci") || normalized.includes("machine")) {
    aiProjectName = "Quantum Compute Node";
    matchedItems = [
      {
        componentId: "comp-2",
        quantity: 1,
        rationale: "Quantum coherence processing capabilities are optimal for sorting multi-dimensional vectors."
      },
      {
        componentId: "comp-4",
        quantity: 2,
        rationale: "Dual-channel high speed kit buffers real-time pipeline datasets cleanly."
      },
      {
        componentId: "comp-7",
        quantity: 1,
        rationale: "20% power overhead margin maintained for core compute safety."
      }
    ];
  } else if (normalized.includes("sensor") || normalized.includes("industrial")) {
    aiProjectName = "Sensing Processing Gateway";
    matchedItems = [
      {
        componentId: "comp-2",
        quantity: 1,
        rationale: "Handles concurrent high-concurrency telemetry feeds smoothly."
      },
      {
        componentId: "comp-10",
        quantity: 5,
        rationale: "Monitors precision multi-axis alignment boundaries efficiently."
      },
      {
        componentId: "comp-13",
        quantity: 2,
        rationale: "Standard high-performance actuator ensures rapid automated sorting feedback."
      }
    ];
  }

  const finalFallbackItems = matchedItems.map(m => {
    const itemObj = catalog.find(c => c.id === m.componentId);
    return {
      component: itemObj || catalog[0],
      quantity: m.quantity,
      rationale: m.rationale
    };
  });

  const totalSum = finalFallbackItems.reduce((acc, cur) => acc + (cur.component.price * cur.quantity), 0);

  res.json({
    project: aiProjectName,
    items: finalFallbackItems,
    total: totalSum
  });
});

// Configure Vite middleware for development, and static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
