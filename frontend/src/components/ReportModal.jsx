import { useState } from "react";
import { Flag, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam or fraud" },
  { value: "hate", label: "Hate or harmful content" },
  { value: "inappropriate", label: "Inappropriate media" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

const ReportModal = ({ type, targetId, targetName, preview, onClose }) => {
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const title = type === "message" ? "Report message" : "Report user";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const endpoint =
        type === "message"
          ? `/reports/messages/${targetId}`
          : `/reports/users/${targetId}`;

      const res = await axiosInstance.post(endpoint, {
        reason,
        details,
      });

      toast.success(res.data?.message || "Report submitted for review");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-base-100 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-base-300 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <Flag className="size-5 text-error" />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{title}</h3>
              {targetName && (
                <p className="truncate text-sm text-base-content/60">{targetName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close report dialog"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {preview && (
            <div className="mb-4 rounded-lg border border-base-300 bg-base-200 p-3 text-sm text-base-content/70">
              <p className="line-clamp-3">{preview}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Reason</p>
            {REPORT_REASONS.map((item) => (
              <label
                key={item.value}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-base-200"
              >
                <input
                  type="radio"
                  name="report-reason"
                  className="radio radio-error radio-sm"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={(e) => setReason(e.target.value)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium">Details</span>
            <textarea
              className="textarea textarea-bordered mt-2 min-h-24 w-full resize-none"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={800}
              placeholder="Add context for review"
            />
            <span className="mt-1 block text-right text-xs text-base-content/50">
              {details.length}/800
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-base-300 p-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-error btn-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportModal;
