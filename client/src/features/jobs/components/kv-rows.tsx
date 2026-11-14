//Key/value row editor for headers and payload — add/remove rows, values are
//plain text; the page turns them into the Records the backend expects
import { Input } from "../../../shared/ui/Input";

interface KV {
  key: string;
  value: string;
}

export function KVRows({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  rows: KV[];
  onChange: (rows: KV[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
            }
          />
          <Input
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
            }
          />
          <button
            type="button"
            className="text-[12px] text-muted hover:text-danger"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="self-start text-[12px] font-semibold hover:underline"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
      >
        + Add row
      </button>
    </div>
  );
}

export type { KV };
