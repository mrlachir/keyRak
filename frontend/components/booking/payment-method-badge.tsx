import { Banknote, CreditCard } from "lucide-react";

import type { PaymentMethod } from "@/types";

export function PaymentMethodBadge({ paymentMethod }: { paymentMethod?: PaymentMethod | null }) {
  if (paymentMethod === "CREDIT_CARD") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-majorelle-200 bg-majorelle-50 px-3 py-1.5 text-xs font-bold text-majorelle-700">
        <CreditCard className="size-3.5" aria-hidden="true" />
        Test credit card
      </span>
    );
  }

  if (paymentMethod === "CASH_ON_ARRIVAL") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-olive-200 bg-olive-50 px-3 py-1.5 text-xs font-bold text-olive-700">
        <Banknote className="size-3.5" aria-hidden="true" />
        Pay on arrival
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-sand-200 bg-sand-100 px-3 py-1.5 text-xs font-semibold text-sand-600">
      Not recorded
    </span>
  );
}
