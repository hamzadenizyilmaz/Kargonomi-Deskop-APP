// Warehouse records (Depolar) shared by the Warehouses screen and the sender
// step of Create Shipment. They are read from GET /warehouses; if that request
// fails, the warehouses seen on the latest shipments still let a shipment be
// created, but they are not presented as the account's warehouse list.

import type { WarehouseRecord } from '@kargonomi/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type WarehouseListStatus = 'loading' | 'loaded' | 'derived' | 'failed';

export interface WarehouseList {
  readonly status: WarehouseListStatus;
  readonly items: readonly WarehouseRecord[];
}

export const initialWarehouseList: WarehouseList = { status: 'loading', items: [] };

export async function fetchWarehouses(): Promise<WarehouseList> {
  try {
    return { status: 'loaded', items: await window.kargonomi.warehouses.list() };
  } catch {
    try {
      const page = await window.kargonomi.shipments.list(1);
      const found = new Map<number, WarehouseRecord>();
      for (const shipment of page.items) {
        if (shipment.warehouse !== null) found.set(shipment.warehouse.id, shipment.warehouse);
      }
      return { status: 'derived', items: [...found.values()] };
    } catch {
      return { status: 'failed', items: [] };
    }
  }
}

export function warehouseLabel(warehouse: WarehouseRecord): string {
  return warehouse.name.trim() === '' ? `Depo #${String(warehouse.id)}` : warehouse.name;
}

// "İl / İlçe" for each record. Records that carry only state_id / city_id are
// named through the locations endpoints, reading each province once.
export function useWarehousePlaces(items: readonly WarehouseRecord[]): (warehouse: WarehouseRecord) => string {
  const pending = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) {
      if ((item.state === null || item.city === null) && typeof item.stateId === 'number') ids.add(item.stateId);
    }
    return [...ids].sort((a, b) => a - b).join(',');
  }, [items]);
  const [states, setStates] = useState<ReadonlyMap<number, string>>(() => new Map());
  const [cities, setCities] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    if (pending === '') return undefined;
    let active = true;
    const stateIds = pending.split(',').map(Number);
    void Promise.all([
      window.kargonomi.locations.states().catch(() => []),
      Promise.all(stateIds.map((stateId) => window.kargonomi.locations.cities(stateId).catch(() => []))),
    ]).then(([stateList, cityLists]) => {
      if (!active) return;
      setStates(new Map(stateList.map((state) => [state.id, state.name])));
      setCities(new Map(cityLists.flatMap((list, index) => list.map((city) => [`${String(stateIds[index])}:${String(city.id)}`, city.name] as const))));
    });
    return () => { active = false; };
  }, [pending]);

  return useCallback((warehouse: WarehouseRecord) => {
    const state = warehouse.state ?? (warehouse.stateId === null ? undefined : states.get(warehouse.stateId));
    const city = warehouse.city ?? (warehouse.stateId === null || warehouse.cityId === null ? undefined : cities.get(`${String(warehouse.stateId)}:${String(warehouse.cityId)}`));
    return [state, city].filter((part): part is string => part !== undefined && part !== '').join(' / ');
  }, [cities, states]);
}
