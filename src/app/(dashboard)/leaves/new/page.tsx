import { LeaveRequestForm } from "@/components/leave-request-form";

export default function NewLeavePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">请假申请 New leave request</h1>
      <LeaveRequestForm />
    </div>
  );
}
