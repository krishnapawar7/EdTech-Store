import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { DemoSwitcher } from "@/components/DemoSwitcher";
import { Navbar } from "@/components/Navbar";
export const metadata = {
    title: "EdTech Store - High School Study Materials & Passes",
    description: "Browse and buy CBSE notes per chapter, subject packs, and class passes with Razorpay UPI payment.",
};
export default function RootLayout({ children, }) {
    return (<html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <CartProvider>
            <DemoSwitcher />
            <Navbar />
            <main className="flex-grow">{children}</main>
            <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="text-white font-bold text-base flex items-center gap-2">
                    🎓 EdTech Store
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Premium CBSE curriculum study materials, comprehensive revision notes, and all-access passes.
                  </p>
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">Products</h4>
                  <ul className="space-y-2">
                    <li>Chapter Notes (₹49)</li>
                    <li>Complete Subject Packs (₹499)</li>
                    <li>30-Day Monthly Pass (₹299)</li>
                    <li>365-Day Annual Pass (₹2,499)</li>
                    <li>Hand-picked Bundles</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">Support & Compliance</h4>
                  <p className="text-slate-400">
                    EdTech Learning Solutions Pvt. Ltd.<br />
                    GSTIN: 27AABCE1234F1Z8<br />
                    SAC Code: 9992 (Online Educational Services)
                  </p>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-center text-slate-500">
                © 2026 EdTech Store. All rights reserved.
              </div>
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>);
}
