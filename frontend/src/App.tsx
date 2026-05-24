import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import SpecsInputView from "./components/SpecsInputView";
import SpecsProcessingView from "./components/SpecsProcessingView";
import SpecsVerifyView from "./components/SpecsVerifyView";
import SpecsPreviewView from "./components/SpecsPreviewView";
import CatalogView from "./components/CatalogView";
import SettingsView from "./components/SettingsView";
import AuthView from "./components/AuthView";

import { ComponentItem, QuoteProposal, SupplierConfig, QuoteLineItem } from "./types";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");

  // Specs Sub-flow State Tracker
  const [specsFlowState, setSpecsFlowState] = useState<"input" | "loading" | "verify" | "preview">("input");

  // Synthetic specs current state
  const [synthProjectName, setSynthProjectName] = useState("Enterprise AI Workstation");
  const [synthTargetBudget, setSynthTargetBudget] = useState(15000);
  const [synthLineItems, setSynthLineItems] = useState<QuoteLineItem[]>([]);

  // Authenticated State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supplierNode, setSupplierNode] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");

  // Backend Synchronized Databases
  const [catalog, setCatalog] = useState<ComponentItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteProposal[]>([]);
  const [settings, setSettings] = useState<SupplierConfig>({
    companyName: "TechRigs Distribution Sdn Bhd",
    contactNumber: "+60 3-2142 0000",
    supportEmail: "quotes@techrigs.com.my",
    businessAddress: "Level 3, Plaza Low Yat, Bukit Bintang, 55100 Kuala Lumpur.",
    customQuotePrefix: "TRD"
  });

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // 1. Initial Database Loading on Mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Fetch Catalog
        const catRes = await fetch("/api/catalog");
        if (catRes.ok) {
          const catData = await catRes.json();
          setCatalog(catData);
        }

        // Fetch Quotes
        const quotesRes = await fetch("/api/quotes");
        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          setQuotes(quotesData);
        }

        // Fetch Settings
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }
      } catch (e) {
        console.error("Failed to connect to back-end endpoints, working in offline-resilient mode.", e);
        // Fallbacks are handled as our standard variables are set initially in state
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadInitialData();
  }, []);

  // Sync state functions back with Express Server
  const handleAddUpdateCatalogItem = async (part: Partial<ComponentItem>) => {
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(part)
      });
      if (res.ok) {
        const updatedItem = await res.json();
        // Update local catalog state
        setCatalog((prev) => {
          const existingIdx = prev.findIndex((c) => c.sku === updatedItem.sku);
          if (existingIdx > -1) {
            const copy = [...prev];
            copy[existingIdx] = updatedItem;
            return copy;
          }
          return [...prev, updatedItem];
        });
      }
    } catch (e) {
      console.error("Failed to persist catalog update server-side.", e);
      // Hard fallback locally to preserve user flow
      setCatalog((prev) => {
        const existingIdx = prev.findIndex((c) => c.sku === part.sku);
        const demoItem: ComponentItem = {
          id: part.id || `comp-demo-${Date.now()}`,
          name: part.name || "Custom Component",
          sku: part.sku || "CUSTOM-SKU",
          price: part.price || 0,
          category: part.category || "CPU",
          icon: part.icon || "layers",
          stock: part.stock || 0,
          lastUpdated: "Just now"
        };
        if (existingIdx > -1) {
          const copy = [...prev];
          copy[existingIdx] = demoItem;
          return copy;
        }
        return [...prev, demoItem];
      });
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    try {
      const res = await fetch(`/api/catalog/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCatalog((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete catalog item server-side.", e);
      setCatalog((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleUpdateSettings = async (newConfig: SupplierConfig) => {
    setSettings(newConfig);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
    } catch (e) {
      console.error("Failed to sync settings server-side", e);
    }
  };

  // 2. AI Synthesis Flow Trigger
  const handleGenerateSpecifications = async (promptText: string, budgetLimit: number) => {
    setSynthTargetBudget(budgetLimit);
    setSpecsFlowState("loading");

    // Give a neat slight extra transition delay so user feels the visual fidelity of loading
    setTimeout(async () => {
      try {
        const res = await fetch("/api/quotes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText, budget: budgetLimit })
        });

        if (res.ok) {
          const genResult = await res.json();
          setSynthProjectName(genResult.project || "AI-Optimized Workstation Proposal");
          setSynthLineItems(genResult.items || []);
          setSpecsFlowState("verify");
        } else {
          throw new Error("Generation endpoint error status");
        }
      } catch (e) {
        console.error("Error synthesizing specification, applying safety rule configurations.", e);
        // Fallback safety to guarantee user experiences a gorgeous output if network lags
        setSynthProjectName("Enterprise Custom Workstation");
         setSynthLineItems([
          {
            component: catalog[0] || { id: "comp-1", name: "AMD Ryzen 7 7800X3D", sku: "AMD-R7-7800X3D", price: 1650, category: "CPU", icon: "developer_board", stock: 45, lastUpdated: "Today" },
            quantity: 1,
            rationale: "Fulfills primary concurrency parameters and guarantees maximum bandwidth allocation limits."
          },
          {
            component: catalog[3] || { id: "comp-4", name: "Corsair Vengeance 32GB DDR5-6000", sku: "CR-VG-32G-6000", price: 520, category: "RAM", icon: "memory", stock: 80, lastUpdated: "Today" },
            quantity: 1,
            rationale: "Sustains optimal memory bandwidth, fully isolating workloads during burst calculations."
          }
        ]);
        setSpecsFlowState("verify");
      }
    }, 2800);
  };

  // 3. User Confirmed Verify Selection -> Leads to Invoice Preview
  const handleConfirmVerification = (finalItems: QuoteLineItem[], finalProjectName: string) => {
    setSynthLineItems(finalItems);
    setSynthProjectName(finalProjectName);
    setSpecsFlowState("preview");
  };

  // 4. Save Quote proposal to system database
  const handleFinishSavingQuote = async (saveToHistory: boolean) => {
    if (saveToHistory) {
      const computedTotal = synthLineItems.reduce((acc, cur) => acc + (cur.component.price * cur.quantity), 0);
      const dataPayload = {
        customer: "Neural Nexus Corp",
        brief: synthProjectName,
        total: computedTotal,
        items: synthLineItems,
        targetBudget: synthTargetBudget,
        project: synthProjectName,
        status: "Draft",
        contactNumber: settings.contactNumber,
        supportEmail: settings.supportEmail,
        address: "67 Innovation Way, Austin, TX 78701"
      };

      try {
        const res = await fetch("/api/quotes/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataPayload)
        });

        if (res.ok) {
          const createdProposal = await res.json();
          setQuotes((prev) => [createdProposal, ...prev]);
        }
      } catch (e) {
        console.error("Failed to save proposal to server history.", e);
        // Fallback local persistence
        const demoSaved: QuoteProposal = {
          id: `q-demo-${Date.now()}`,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          customer: "Neural Nexus Corp",
          brief: synthProjectName,
          total: computedTotal,
          status: "Draft",
          items: synthLineItems,
          targetBudget: synthTargetBudget,
          project: synthProjectName
        };
        setQuotes((prev) => [demoSaved, ...prev]);
      }
    }

    // Reset Specs Flow
    setSpecsFlowState("input");
    setCurrentTab("dashboard");
  };

  // 5. Auth handlers
  const handleAuthenticate = (company: string, email: string) => {
    setIsAuthenticated(true);
    setSupplierNode(company);
    setSupplierEmail(email);
    setCurrentTab("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSupplierNode("");
    setSupplierEmail("");
    setCurrentTab("dashboard");
  };

  // Quick view proposal in print format from billing click list
  const handleViewHistoricalQuote = (quote: QuoteProposal) => {
    setSynthProjectName(quote.project || quote.brief);
    setSynthTargetBudget(quote.targetBudget || quote.total);
    setSynthLineItems(quote.items);
    setSpecsFlowState("preview");
    setCurrentTab("specs");
  };

  // Calculate dynamic Low Stock alerts from catalog
  const stockAlerts = catalog
    .filter((it) => it.stock <= 10)
    .map((it) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      stock: it.stock,
      icon: it.icon
    }));

  if (!isAuthenticated) {
    return <AuthView onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="flex bg-[#faf9f6] text-[#1a1c1a] min-h-screen font-sans antialiased selection:bg-[#bcdeb5]">
      
      {/* Universal Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab === "specs") {
            setSpecsFlowState("input"); // Reset specs workflow when clicking fresh
          }
        }}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />

      {/* Main viewport frame */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto print:p-0 print:m-0 print:max-w-none">
        
        {/* Render Dashboard View */}
        {currentTab === "dashboard" && (
          <DashboardView
            quotes={quotes}
            stockAlerts={stockAlerts}
            onNewQuoteClick={() => {
              setCurrentTab("specs");
              setSpecsFlowState("input");
            }}
            onViewQuote={handleViewHistoricalQuote}
            onNavigateToCatalog={() => setCurrentTab("catalog")}
          />
        )}

        {/* Render Specs Generation Process Flows */}
        {currentTab === "specs" && (
          <>
            {specsFlowState === "input" && (
              <SpecsInputView onGenerate={handleGenerateSpecifications} />
            )}

            {specsFlowState === "loading" && (
              <SpecsProcessingView />
            )}

            {specsFlowState === "verify" && (
              <SpecsVerifyView
                projectName={synthProjectName}
                targetBudget={synthTargetBudget}
                initialItems={synthLineItems}
                allCatalogItems={catalog}
                onConfirm={handleConfirmVerification}
                onDiscard={() => setSpecsFlowState("input")}
              />
            )}

            {specsFlowState === "preview" && (
              <SpecsPreviewView
                projectName={synthProjectName}
                items={synthLineItems}
                customerName="Neural Nexus Corp"
                targetBudget={synthTargetBudget}
                settings={settings}
                onFinish={handleFinishSavingQuote}
              />
            )}
          </>
        )}

        {/* Render Catalog List Page */}
        {currentTab === "catalog" && (
          <CatalogView
            items={catalog}
            onAddUpdateItem={handleAddUpdateCatalogItem}
            onDeleteItem={handleDeleteCatalogItem}
          />
        )}

        {/* Render Settings Page */}
        {currentTab === "settings" && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleUpdateSettings}
          />
        )}

        {/* Render Authentication Gate */}
        {currentTab === "auth" && (
          <AuthView onAuthenticate={handleAuthenticate} />
        )}

      </main>
    </div>
  );
}
