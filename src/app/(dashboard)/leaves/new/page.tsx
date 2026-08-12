import { LeaveRequestForm } from "@/components/leave-request-form";
import { Bi } from "@/components/bi";

export default function NewLeavePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="请假申请" en="New leave request" />
      </h1>
      <LeaveRequestForm />
    </div>
  );
}
