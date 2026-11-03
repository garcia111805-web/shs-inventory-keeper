from pathlib import Path
p = Path(r'C:\PROJECTS\SUCAT ELEMENTARY INVENTORY SYSTEM\src\components\CSVImportModal.tsx')
text = p.read_text(encoding='utf-8')

# remove stale state
text = text.replace("const [updated, setUpdated] = useState(0);\n", "")
text = text.replace("const [skipped, setSkipped] = useState(0);\n", "")

# remove wipe block if present
start = text.find('            {items.length === 0 ? (')
end = text.find('            {/* File selection') + 1
if start != -1 and end != -1:
    text = text[:start] + text[end:]

# progress bar
text = text.replace("width: `${Math.max(3, ((imported + updated + skipped + failed) / parsed.length) * 100)}%`,", "width: `${Math.max(3, (imported / parsed.length) * 100)}%`,")

# progress text
old_progress = "{imported > 0 && <span style={{ color: '#22c55e' }}>{imported} added · </span>}\n                    {updated > 0 && <span style={{ color: '#60a5fa' }}>{updated} updated · </span>}\n                    {skipped > 0 && <span style={{ color: '#fbbf24' }}>{skipped} unchanged · </span>}\n                    {failed > 0 && <span style={{ color: '#f87171' }}>{failed} failed</span>}\n                    {imported + updated + skipped + failed === 0 && <span>Processing...</span>}"
new_progress = "{imported > 0 && <span style={{ color: '#22c55e' }}>{imported} imported</span>}\n                    {failed > 0 && <span style={{ color: '#f87171' }}> · {failed} failed</span>}\n                    {imported === 0 && <span>Processing...</span>}"
text = text.replace(old_progress, new_progress)

# success stats: drop updated/skipped cards
old_stats = """            {updated > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <p className="font-heading font-black" style={{ fontSize: 24, color: '#60a5fa' }}>{updated}</p>
                <p className="font-body font-semibold" style={{ fontSize: 11, color: '#60a5fa' }}>Updated</p>
              </div>
            )}
            {skipped > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="font-heading font-black" style={{ fontSize: 24, color: '#fbbf24' }}>{skipped}</p>
                <p className="font-body font-semibold" style={{ fontSize: 11, color: '#fbbf24' }}>Unchanged</p>
              </div>
            )}"""
text = text.replace(old_stats, "")

# remove changedItems/addedItems breakdown if present
start = text.find('          {/* Changed items breakdown */}')
end = text.find('          <div className="pt-2 border-t border-[var(--card-border)] w-full shrink-0">')
if start != -1 and end != -1:
    text = text[:start] + text[end:]

# remove counter resets
text = text.replace("    setUpdated(0);\n    setSkipped(0);\n", "")

p.write_text(text, encoding='utf-8')
print('done')
