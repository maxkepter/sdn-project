const features = [
  {
    title: "Quick listing",
    desc: "Take a photo, add a price and a title — you can be selling in minutes.",
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.5c-.38 0-.734-.15-1-.395M6.827 6.175A2.31 2.31 0 017.5 5.186m0-1.378a2.31 2.31 0 012.607 1.607M6.827 6.175A2.31 2.31 0 015.186 7.5c-.38 0-.734-.15-1-.395M6.827 6.175A2.31 2.31 0 017.5 5.186m0-1.378a2.31 2.31 0 012.607 1.607m-3.733-1.378l-1.026.002a2.31 2.31 0 00-1.855 1.073m0 0L3 9.5v3.75M6.827 6.175L3 9.75m9.75-5.186c.15.09.285.2.394.323M12 4.564c.15.09.285.2.394.323m6.712 3.888a2.31 2.31 0 00-1.855-1.073l-1.026-.002m9.75 5.186V9.75l-3.827-3.575M21 9.75v3.75m-4.5 3.75h9" />
      </svg>
    ),
  },
  {
    title: "Secure payments",
    desc: "eBay processes all payments securely so you never have to worry.",
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Easy shipping",
    desc: "We'll help you choose the right shipping option and get a QR code to drop off.",
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
];

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-4 mt-8">
      {features.map((f, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
          <div className="mb-4">{f.icon}</div>
          <h3 className="text-lg font-bold text-gray-800">{f.title}</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}
