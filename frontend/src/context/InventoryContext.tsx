/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ComponentItem } from '../types';
import { normalizeCategory, normalizeIcon } from '../services/quoteAdapter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

interface InventoryContextType {
  inventory: ComponentItem[];
  loading: boolean;
  refreshInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog')
        .select('*');
      
      if (error) {
        console.error('Error fetching inventory:', error);
      } else {
        setInventory((data || []).map((item: any) => {
          const category = normalizeCategory(item.category);
          return {
            ...item,
            name: item.part_name || item.name || item.sku,
            part_name: item.part_name || item.name || item.sku,
            category,
            price: Number(item.price || 0),
            stock_level: Number(item.stock_level || 0),
            icon: normalizeIcon(item.icon, category),
            specs: item.specs || {},
          };
        }));
      }
    } catch (err) {
      console.error('Unexpected error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <InventoryContext.Provider value={{ inventory, loading, refreshInventory: fetchInventory }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
