'use client'

import { useState } from 'react'
import { Save, Check, RotateCcw } from 'lucide-react'
import { EDITABLE_PAGES, type PageKey } from '@/lib/site-config'

interface Props {
  initialContent: Record<PageKey, Record<string, string>>
}

type SaveState = 'idle' | 'saving' | 'saved'

export function PageContentEditor({ initialContent }: Props) {
  const pages = Object.keys(EDITABLE_PAGES) as PageKey[]
  const [activeTab, setActiveTab] = useState<PageKey>(pages[0])

  const [content, setContent] = useState<Record<PageKey, Record<string, string>>>(
    () => {
      const init: Record<string, Record<string, string>> = {}
      for (const page of pages) {
        init[page] = { ...initialContent[page] }
      }
      return init as Record<PageKey, Record<string, string>>
    }
  )

  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  function set(page: PageKey, key: string, value: string) {
    setContent(prev => ({ ...prev, [page]: { ...prev[page], [key]: value } }))
    setSaveStates(prev => ({ ...prev, [`${page}_${key}`]: 'idle' }))
  }

  function reset(page: PageKey, key: string) {
    const section = EDITABLE_PAGES[page].sections.find(s => s.key === key)
    if (section) set(page, key, section.default)
  }

  async function save(page: PageKey, key: string) {
    const stateKey = `${page}_${key}`
    setSaveStates(prev => ({ ...prev, [stateKey]: 'saving' }))
    await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, key, value: content[page][key] }),
    })
    setSaveStates(prev => ({ ...prev, [stateKey]: 'saved' }))
    setTimeout(() => setSaveStates(prev => ({ ...prev, [stateKey]: 'idle' })), 3000)
  }

  async function saveAll(page: PageKey) {
    const sections = EDITABLE_PAGES[page].sections
    await Promise.all(sections.map(s => save(page, s.key)))
  }

  const tab = EDITABLE_PAGES[activeTab]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {pages.map(page => (
          <button
            key={page}
            onClick={() => setActiveTab(page)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === page
                ? 'border-teal-500 text-teal-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {EDITABLE_PAGES[page].label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Edit the text shown on the <strong className="text-gray-600">{tab.label}</strong>. Changes save per-field.
          </p>
          <button
            onClick={() => saveAll(activeTab)}
            className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save size={11} /> Save All
          </button>
        </div>

        {tab.sections.map(section => {
          const stateKey = `${activeTab}_${section.key}`
          const state    = saveStates[stateKey] ?? 'idle'
          const val      = content[activeTab]?.[section.key] ?? section.default
          const isDirty  = val !== section.default

          return (
            <div key={section.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600">{section.label}</label>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      onClick={() => reset(activeTab, section.key)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                  <button
                    onClick={() => save(activeTab, section.key)}
                    disabled={state === 'saving'}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      state === 'saved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                    }`}
                  >
                    {state === 'saved' ? <><Check size={10} /> Saved</> : state === 'saving' ? 'Saving…' : <><Save size={10} /> Save</>}
                  </button>
                </div>
              </div>

              {section.type === 'textarea' ? (
                <textarea
                  value={val}
                  onChange={e => set(activeTab, section.key, e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400 bg-white resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={val}
                  onChange={e => set(activeTab, section.key, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400 bg-white"
                />
              )}

              <p className="text-[10px] text-gray-400 font-mono">default: &quot;{section.default}&quot;</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
