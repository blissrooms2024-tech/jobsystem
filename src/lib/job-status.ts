export const JOB_STATUS_LABEL: Record<string, string> = {
  assigned: "待完成 Assigned",
  in_progress: "打卡中 In progress",
  completed: "已完成 Completed",
  cancelled: "已取消 Cancelled",
  missed: "错过 Missed",
};

export const JOB_STATUS_STYLE: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-neutral-200 text-neutral-600",
  missed: "bg-red-100 text-red-800",
};
