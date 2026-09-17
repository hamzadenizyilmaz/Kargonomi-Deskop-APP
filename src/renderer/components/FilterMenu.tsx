// Filter trigger from Shipments / Filter Toolbar (9:142 …) opening the shared
// Select Menu (52:22). The trigger always shows the field name — the chosen
// value is surfaced as a chip in the Active Filters row (9:656).

import { useListbox, type ListOption } from './Listbox.tsx';

export type FilterOption = ListOption;

export function FilterMenu({ label, width, options, value, onChange }: {
  readonly label: string;
  readonly width: number;
  readonly options: readonly FilterOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const { triggerProps, popover } = useListbox({ label, options, value, onChange });
  return (
    <>
      <button type="button" className="filter-box" style={{ width }} {...triggerProps}>{label}</button>
      {popover}
    </>
  );
}
