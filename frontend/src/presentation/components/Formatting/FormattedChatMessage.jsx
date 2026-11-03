// Renders AI chat messages cleanly formatted without markdown clutter
export const FormattedChatMessage = ({ text }) => {
  if (!text) return null;

  // 1. Remove json wrapper block if present
  let cleanText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

  // 2. Normalize section headers
  cleanText = cleanText.replaceAll('### ', '\n\n### ');

  // 3. Normalize horizontal rules
  cleanText = cleanText.replaceAll('---', '\n---\n').replaceAll('***', '\n---\n');

  // 4. Normalize bullet points
  cleanText = cleanText.replaceAll('* **', '\n• **');

  // Split text into paragraphs by newline
  const lines = cleanText.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Header lines (### Header)
        if (trimmed.startsWith('###')) {
          const headerText = trimmed.replace(/^###\s*/, '').replaceAll('**', '').trim();
          return (
            <div key={`header-${i}-${headerText.slice(0, 8)}`} style={{
              fontWeight: '700',
              fontSize: '13.5px',
              color: '#0f172a',
              marginTop: '8px',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '4px', height: '14px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>{headerText}</span>
            </div>
          );
        }

        // Horizontal divider (---)
        if (trimmed === '---') {
          return <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />;
        }

        // Parse bold markdown **text** inside line
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`part-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        // Bullet point lines
        if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const cleanItem = trimmed.replace(/^[•*-]\s*/, '');
          const itemParts = cleanItem.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={`bullet-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          return (
            <div key={`bullet-line-${i}-${cleanItem.slice(0, 8)}`} style={{ paddingLeft: '4px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>•</span>
              <div>{itemParts}</div>
            </div>
          );
        }

        // Numbered list items (1. 2. 3.)
        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const rest = numMatch[2];
          const restParts = rest.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={`num-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          return (
            <div key={`num-line-${i}-${num}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9', marginTop: '2px' }}>
              <span style={{ color: '#059669', fontWeight: '800', fontSize: '11.5px', background: '#ecfdf5', padding: '1px 6px', borderRadius: '10px' }}>{num}</span>
              <div>{restParts}</div>
            </div>
          );
        }

        return <div key={`line-${i}-${trimmed.slice(0, 8)}`}>{formattedParts}</div>;
      })}
    </div>
  );
};
