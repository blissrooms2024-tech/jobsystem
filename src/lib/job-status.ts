export const JOB_STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  assigned: { zh: "待完成", en: "Assigned" },
  in_progress: { zh: "打卡中", en: "In progress" },
  completed: { zh: "已完成", en: "Completed" },
  cancelled: { zh: "已取消", en: "Cancelled" },
  missed: { zh: "错过", en: "Missed" },
};

export const JOB_STATUS_STYLE: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-neutral-200 text-neutral-600",
  missed: "bg-red-100 text-red-800",
};
