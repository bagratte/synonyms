import { useState } from "react";
import { useGame } from "./hooks/useGame";
import { FlashCard } from "./components/FlashCard";
import { Settings } from "./components/Settings";
import type { LangFilter } from "./data/types";

export default function App() {
  const [filter, setFilter] = useState<LangFilter>("both");
  const [showSettings, setShowSettings] = useState(false);
  const { card, selected, submitted, toggle, submit, nextCard, loading } = useGame(filter);

  return (
    <div className="app">
      <header className="header">
        <span className="header__logo">Synonyms</span>
        <button className="header__settings" onClick={() => setShowSettings(true)} aria-label="Settings">
          ⚙
        </button>
      </header>

      <main className="main">
        {loading && <p className="status">Loading...</p>}
        {!loading && !card && <p className="status">No words available for this filter.</p>}
        {!loading && card && (
          <FlashCard
            card={card}
            selected={selected}
            submitted={submitted}
            onToggle={toggle}
            onSubmit={submit}
            onNext={nextCard}
          />
        )}
      </main>

      {showSettings && (
        <Settings
          filter={filter}
          onChange={setFilter}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
