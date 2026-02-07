"use client";

export function TaxBreakdown({
  subtotal,
  discountAmount = 0,
  taxAmount,
  taxBreakdown = [],
}: {
  subtotal: number;
  discountAmount?: number;
  taxAmount: number;
  taxBreakdown?: Array<{ name: string; rate: number; amount: number }>;
}) {
  const afterDiscount = subtotal - discountAmount;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">₹{subtotal.toLocaleString()}</span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>−₹{discountAmount.toLocaleString()}</span>
        </div>
      )}

      {taxBreakdown.length > 0 ? (
        taxBreakdown.map((tax) => (
          <div key={tax.name} className="flex justify-between">
            <span className="text-muted-foreground">
              {tax.name} ({Number(tax.rate).toFixed(0)}%)
            </span>
            <span className="font-medium">
              ₹{Number(tax.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))
      ) : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium">
            ₹{taxAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      <hr className="border-border" />

      <div className="flex justify-between text-base font-bold">
        <span>Total</span>
        <span>
          ₹
          {(afterDiscount + taxAmount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
