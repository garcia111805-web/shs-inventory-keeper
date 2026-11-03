from pathlib import Path
p = Path(r'C:\PROJECTS\SUCAT ELEMENTARY INVENTORY SYSTEM\src\components\CSVImportModal.tsx')
text = p.read_text(encoding='utf-8')
start = text.find('                <div className="rounded-xl overflow-hidden"')
end = text.find('            {/* Import progress */}')
if start == -1 or end == -1:
    raise SystemExit('markers not found')
replacement = '''                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)', maxHeight: 320, overflowY: 'auto' }}>
                  <table className="w-full hidden md:table" style={{ fontSize: 12, tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)' }}>
                        {['Name', 'Category', 'Unit', 'Qty', 'Threshold', 'Location', 'Type'].map(h => (
                          <th key={h} className="text-left px-3 py-3 font-body uppercase whitespace-nowrap" style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)', background: row.isDuplicate ? 'rgba(217,119,6,0.08)' : undefined }}>
                          <td className="px-3 py-3 font-body font-semibold align-top" style={{ color: 'var(--fg-color)', minWidth: 140 }}>
                            <div className="truncate" title={row.name}>{row.name}</div>
                            {row.isDuplicate && (<span className="font-body ml-1 px-1.5 py-0.5 rounded" style={{ fontSize: 9, background: 'rgba(217,119,6,0.15)', color: '#d97706' }}>exists</span>)}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select value={row.category} onChange={(e) => { const newCat = e.target.value; setParsed(prev => prev.map((item, i) => i === idx ? { ...item, category: newCat } : item)); }} className="font-body font-bold px-2 py-2 rounded text-white text-xs border border-white/20 cursor-pointer outline-none shadow-sm w-full" style={{ background: getCategoryColor(row.category) }} title="Click to adjust category">
                              {availableCategories.map(cat => (<option key={cat} value={cat} style={{ background: '#1e293b', color: 'white' }}>{getCategoryLabel(cat)}</option>))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select value={row.unit} onChange={(e) => { const newUnit = e.target.value.toUpperCase(); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, unit: newUnit } : item)); }} className="font-body text-xs px-2 py-2 rounded border border-white/20 cursor-pointer outline-none shadow-sm bg-slate-800 text-white w-full" disabled={unitsLoading}>
                              {units.map(u => (<option key={u.id} value={u.name.toUpperCase()} style={{ background: '#1e293b', color: 'white' }}>{u.name.toUpperCase()}</option>))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input type="number" min="0" value={row.quantity} onChange={(e) => { const newQty = Math.max(0, parseInt(e.target.value) || 0); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item)); }} className="w-full font-body font-bold text-xs text-center px-2 py-2 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input type="number" min="0" value={row.lowStockThreshold} onChange={(e) => { const newThresh = Math.max(0, parseInt(e.target.value) || 0); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, lowStockThreshold: newThresh } : item)); }} className="w-full font-body text-xs text-center px-2 py-2 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select value={row.location || ''} onChange={(e) => { const newLoc = e.target.value || undefined; setParsed(prev => prev.map((item, i) => i === idx ? { ...item, location: newLoc } : item)); }} className="font-body text-xs px-2 py-2 rounded border border-white/20 cursor-pointer outline-none shadow-sm bg-slate-800 text-white w-full" disabled={locationsLoading}>
                              <option value="">— None —</option>
                              {locations.map(loc => (<option key={loc.id} value={loc.name} style={{ background: '#1e293b', color: 'white' }}>{loc.name}</option>))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <button onClick={() => { setParsed(prev => prev.map((item, i) => i === idx ? { ...item, isConsumable: !item.isConsumable } : item)); }} className="font-body font-bold px-3 py-2 rounded text-white text-xs border border-white/20 cursor-pointer shadow-sm whitespace-nowrap w-full" style={{ background: row.isConsumable ? '#d97706' : '#7c3aed' }} title={row.isConsumable ? 'Consumable Supply — click to make Non-Consumable' : 'Non-Consumable — click to make Consumable'}>
                              {row.isConsumable ? 'Consumable' : 'Non-Consumable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="md:hidden space-y-2">
                    {parsed.map((row, idx) => (
                      <div key={idx} className="rounded-lg p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-body font-bold text-sm truncate mr-2" style={{ color: 'var(--fg-color)' }}>{row.name}</div>
                          {row.isDuplicate && (<span className="font-body px-2 py-1 rounded shrink-0" style={{ fontSize: 10, background: 'rgba(217,119,6,0.15)', color: '#d97706' }}>exists</span>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-text)' }}>Category</label>
                            <select value={row.category} onChange={(e) => { const newCat = e.target.value; setParsed(prev => prev.map((item, i) => i === idx ? { ...item, category: newCat } : item)); }} className="font-body font-bold mt-1 px-2 py-2 rounded text-white text-xs border border-white/20 w-full" style={{ background: getCategoryColor(row.category) }}>
                              {availableCategories.map(cat => (<option key={cat} value={cat} style={{ background: '#1e293b', color: 'white' }}>{getCategoryLabel(cat)}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-text)' }}>Unit</label>
                            <select value={row.unit} onChange={(e) => { const newUnit = e.target.value.toUpperCase(); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, unit: newUnit } : item)); }} className="font-body mt-1 px-2 py-2 rounded border border-white/20 bg-slate-800 text-white w-full" disabled={unitsLoading}>
                              {units.map(u => (<option key={u.id} value={u.name.toUpperCase()} style={{ background: '#1e293b', color: 'white' }}>{u.name.toUpperCase()}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-text)' }}>Qty</label>
                            <input type="number" min="0" value={row.quantity} onChange={(e) => { const newQty = Math.max(0, parseInt(e.target.value) || 0); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item)); }} className="mt-1 w-full font-body font-bold text-xs text-center px-2 py-2 rounded border border-white/20 bg-slate-800 text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-text)' }}>Threshold</label>
                            <input type="number" min="0" value={row.lowStockThreshold} onChange={(e) => { const newThresh = Math.max(0, parseInt(e.target.value) || 0); setParsed(prev => prev.map((item, i) => i === idx ? { ...item, lowStockThreshold: newThresh } : item)); }} className="mt-1 w-full font-body text-xs text-center px-2 py-2 rounded border border-white/20 bg-slate-800 text-white" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-text)' }}>Location</label>
                            <select value={row.location || ''} onChange={(e) => { const newLoc = e.target.value || undefined; setParsed(prev => prev.map((item, i) => i === idx ? { ...item, location: newLoc } : item)); }} className="font-body mt-1 px-2 py-2 rounded border border-white/20 bg-slate-800 text-white w-full" disabled={locationsLoading}>
                              <option value="">— None —</option>
                              {locations.map(loc => (<option key={loc.id} value={loc.name} style={{ background: '#1e293b', color: 'white' }}>{loc.name}</option>))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <button onClick={() => { setParsed(prev => prev.map((item, i) => i === idx ? { ...item, isConsumable: !item.isConsumable } : item)); }} className="font-body font-bold mt-1 px-3 py-2 rounded text-white text-xs border border-white/20 cursor-pointer shadow-sm w-full" style={{ background: row.isConsumable ? '#d97706' : '#7c3aed' }} title={row.isConsumable ? 'Consumable Supply — click to make Non-Consumable' : 'Non-Consumable — click to make Consumable'}>
                              {row.isConsumable ? 'Consumable' : 'Non-Consumable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>'''
text = text[:start] + replacement + text[end:]
p.write_text(text, encoding='utf-8')
print('done')
