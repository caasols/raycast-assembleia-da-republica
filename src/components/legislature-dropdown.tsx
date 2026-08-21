import { List } from "@raycast/api";
import { ALL_LEGISLATURES } from "./use-legislatures";

/**
 * The legislature filter, as a search-bar accessory.
 *
 * Newest first: a legislature list runs from 1976 to now, and the recent ones
 * are what a lookup is nearly always about.
 */
export function LegislatureDropdown({
  legislatures,
  value,
  onChange,
}: {
  legislatures: { id: string; nome: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Legislature" value={value} onChange={onChange}>
      <List.Dropdown.Item value={ALL_LEGISLATURES} title="All legislatures" />
      {[...legislatures].reverse().map((legislature) => (
        <List.Dropdown.Item key={legislature.id} value={legislature.id} title={legislature.nome || legislature.id} />
      ))}
    </List.Dropdown>
  );
}
