import { Navbar } from "@/components/navbar";
import { CartProvider } from "@/lib/cart-context";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <Navbar />
      {children}
    </CartProvider>
  );
}
