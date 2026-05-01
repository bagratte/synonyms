import { useState } from "react";
import { useGame } from "./hooks/useGame";
import { FlashCard } from "./components/FlashCard";
import { Explore } from "./components/Explore";
import { Settings } from "./components/Settings";
import type { LangFilter } from "./data/types";

type View = "play" | "explore";

export default function App() {
  const [view, setView] = useState<View>("play");
  const [filter, setFilter] = useState<LangFilter>("both");
  const [showSettings, setShowSettings] = useState(false);
  const { card, selected, submitted, toggle, submit, nextCard, loading } = useGame(filter);

  return (
    <div className="app">
      <header className="header">
        <span className="header__logo">Synonyms</span>
        <nav className="header__nav">
          <button
            className={`header__nav-btn${view === "play" ? " header__nav-btn--active" : ""}`}
            onClick={() => setView("play")}
          >
            Play
          </button>
          <button
            className={`header__nav-btn${view === "explore" ? " header__nav-btn--active" : ""}`}
            onClick={() => setView("explore")}
          >
            Explore
          </button>
        </nav>
        <div className="header__right">
          {view === "play" && (
            <button className="header__settings" onClick={() => setShowSettings(true)} aria-label="Settings">
              ⚙
            </button>
          )}
        </div>
      </header>

      {view === "play" && (
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
      )}

      {view === "explore" && <Explore />}

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
