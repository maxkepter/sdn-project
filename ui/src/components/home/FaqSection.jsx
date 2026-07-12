const faqs = [
  { q: "How do I start selling on eBay?", a: "Create an account, click 'Sell' at the top of any page, and follow the prompts to list your first item." },
  { q: "What can I sell on eBay?", a: "You can sell almost anything — electronics, fashion, collectibles, home goods, and more. Check our prohibited items policy for exceptions." },
  { q: "Are there any fees for selling?", a: "Most listings are free. You only pay a final value fee when your item sells. eBay Store subscribers get additional benefits." },
  { q: "How do I get paid?", a: "eBay pays you via direct deposit to your bank account. Payouts are typically processed within 1-2 business days after the buyer pays." },
  { q: "What shipping options do I have?", a: "You can ship on your own or use eBay's discounted shipping labels. We also offer the option to use a QR code for drop-off." },
];

export default function FaqSection() {
  return (
    <div className="mx-4 mt-12 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently asked questions</h2>
      <div className="space-y-3 max-w-3xl">
        {faqs.map((faq, i) => (
          <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-800 cursor-pointer hover:bg-gray-50 list-none">
              {faq.q}
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
