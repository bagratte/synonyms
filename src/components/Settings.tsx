import type { Lang, LangFilter } from "../data/types";
import { LANGS } from "../data/types";

const LANG_LABELS: Record<Lang, string> = { en: "English", it: "Italian", ru: "Russian" };

interface Props {
  filter: LangFilter;
  onChange: (f: LangFilter) => void;
  onClose: () => void;
}

export function Settings({ filter, onChange, onClose }: Props) {
  function toggle(lang: Lang) {
    const next = { ...filter, [lang]: !filter[lang] };
    if (LANGS.some((l) => next[l])) onChange(next);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <h2 className="settings__title">Settings</h2>

        <fieldset className="settings__group">
          <legend className="settings__label">Languages</legend>
          {LANGS.map((lang) => (
            <label key={lang} className="settings__option">
              <input
                type="checkbox"
                checked={filter[lang]}
                onChange={() => toggle(lang)}
              />
              {LANG_LABELS[lang]}
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
