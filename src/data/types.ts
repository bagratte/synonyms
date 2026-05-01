export type Pos = "n" | "v" | "a" | "s" | "r";
export type Lang = "en" | "it";

export interface LemmaRef {
  synset: string;
  lemma: string;
}

export interface Lemma {
  name: string;
  count?: number;
  antonyms?: LemmaRef[];
  related?: LemmaRef[];    // derivationally related forms
  pertainyms?: LemmaRef[];
  frames?: string[];       // verb frame strings
}

export interface Synset {
  id: string;
  pos: Pos;
  lexname: string;
  def: string;
  examples?: string[];
  en?: Lemma[];
  it?: Lemma[];
  // Relations — all optional, omitted when empty
  hypernyms?: string[];
  instance_hypernyms?: string[];
  hyponyms?: string[];
  instance_hyponyms?: string[];
  part_meronyms?: string[];
  part_holonyms?: string[];
  member_meronyms?: string[];
  member_holonyms?: string[];
  substance_meronyms?: string[];
  substance_holonyms?: string[];
  similar?: string[];
  also?: string[];
  attributes?: string[];
  entailments?: string[];
  causes?: string[];
  verb_groups?: string[];
  topic_domains?: string[];
  region_domains?: string[];
  usage_domains?: string[];
  in_topic_domains?: string[];
  in_region_domains?: string[];
  in_usage_domains?: string[];
}

export interface Card {
  prompt: string;
  promptLang: Lang;
  synsetId: string;
  options: Option[];
}

export interface Option {
  word: string;
  lang: Lang;
  correct: boolean;
}

export type LangFilter = "en" | "it" | "both";
