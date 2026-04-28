// Tweaks for Alien Emoji site
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#c4691a",
  "headlineStyle": "mixed",
  "displayFont": "Inter Tight",
  "showWordmarks": true,
  "denseNav": false
}/*EDITMODE-END*/;

const ACCENTS = {
  "Amber":   "#c4691a",
  "Forest":  "#2f6b3c",
  "Indigo":  "#3b4ec4",
  "Vermilion":"#c4422a",
  "Graphite":"#2a2a2a"
};

const FONTS = ["Inter Tight", "Instrument Serif", "JetBrains Mono"];

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty('--accent', t.accentColor);
  // accent-soft auto
  if (!t.denseNav) {
    document.querySelectorAll('.nav').forEach(n => n.style.height = '');
  }
  // headline style: 'mixed' (default), 'serif' (everything in serif italic), 'sans' (no italics)
  document.querySelectorAll('em').forEach(em => {
    if (t.headlineStyle === 'sans') {
      em.style.fontStyle = 'normal';
      em.style.fontFamily = 'inherit';
      em.style.color = '';
    } else if (t.headlineStyle === 'serif') {
      em.style.fontStyle = 'italic';
      em.style.fontFamily = "'Instrument Serif', Georgia, serif";
      em.style.color = t.accentColor;
    } else {
      em.style.fontStyle = '';
      em.style.fontFamily = '';
      em.style.color = '';
    }
  });
  // wordmark visibility (the colossus)
  document.querySelectorAll('.colossus').forEach(c => {
    c.style.display = t.showWordmarks ? '' : 'none';
  });
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Accent color">
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {Object.entries(ACCENTS).map(([name, hex]) => (
            <button
              key={name}
              type="button"
              onClick={() => setTweak('accentColor', hex)}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'6px 10px', borderRadius:999,
                border: tweaks.accentColor === hex ? '1px solid #111' : '1px solid #ddd',
                background:'#fff', cursor:'pointer', fontSize:12, fontFamily:'inherit'
              }}
            >
              <span style={{width:10, height:10, borderRadius:999, background:hex}}/>
              {name}
            </button>
          ))}
        </div>
      </TweakSection>
      <TweakSection label="Headline italics">
        <TweakRadio
          value={tweaks.headlineStyle}
          onChange={(v) => setTweak('headlineStyle', v)}
          options={[
            { value: 'mixed', label: 'Mixed' },
            { value: 'serif', label: 'All serif' },
            { value: 'sans', label: 'All sans' },
          ]}
        />
      </TweakSection>
      <TweakSection label="Display">
        <TweakToggle
          label="Show colossal wordmarks"
          value={tweaks.showWordmarks}
          onChange={(v) => setTweak('showWordmarks', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<App />);
