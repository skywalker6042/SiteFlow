'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg hover:bg-gray-700 transition-colors print:hidden"
    >
      Print / Save PDF
    </button>
  )
}
