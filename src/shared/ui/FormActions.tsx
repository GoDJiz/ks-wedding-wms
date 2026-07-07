import { Button } from "./Button";

export type FormActionsProps = {
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveLabel: string;
  cancelLabel: string;
  deleteLabel?: string;
};

/**
 * Enforces the UI Consistency rule: Save always rightmost/topmost,
 * Cancel immediately left of Save, Delete visually separated (left-aligned)
 * to prevent mis-taps — an elderly-accessibility requirement, not styling.
 */
export function FormActions({
  onCancel,
  onDelete,
  saving = false,
  saveLabel,
  cancelLabel,
  deleteLabel,
}: FormActionsProps) {
  return (
    <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-3 backdrop-blur">
      <div>
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            {deleteLabel}
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
