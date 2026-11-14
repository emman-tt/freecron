//Delete confirm — red title, honest wording, "Cannot undo" (design: Delete
//Modal). Shared by the jobs list and the job report
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";

export function DeleteConfirm({
  name,
  onCancel,
  onConfirm,
  busy,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#0a0a0a66]">
      <Card className="w-sm border-danger p-5">
        <h2 className="text-[14px] font-bold text-danger">Delete {name}?</h2>
        <p className="mt-1 text-[12px] text-muted">
          Deletes the job and its executions and notifications. Cannot undo.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
