import type { LangFilter } from "../data/types";

interface Props {
  filter: LangFilter;
  onChange: (f: LangFilter) => void;
  onClose: () => void;
}

export function Settings({ filter, onChange, onClose }: Props) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <h2 className="settings__title">Settings</h2>

        <fieldset className="settings__group">
          <legend className="settings__label">Languages</legend>
          {(["both", "en", "it"] as LangFilter[]).map((opt) => (
            <label key={opt} className="settings__option">
              <input
                type="radio"
                name="lang"
                value={opt}
                checked={filter === opt}
                onChange={() => onChange(opt)}
              />
              {opt === "both" ? "English + Italian" : opt === "en" ? "English only" : "Italian only"}
            </label>
          ))}
        </fieldset>

        <button className="btn btn--secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
