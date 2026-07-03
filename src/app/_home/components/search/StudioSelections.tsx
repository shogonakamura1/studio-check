"use client";

import {
  BUZZ_STUDIOS,
  CIVIC_HALL_ROOMS,
  CREA_STUDIOS,
  INSTABASE_SPACES,
} from "@/app/_home/constants";

type Props = {
  selectedStudios: string[];
  toggleStudio: (studioId: string) => void;
};

type StudioOption = {
  id: string;
  name: string;
  /** 名前の下に出す補足（muted色） */
  description: string;
  /** さらに下に出すアクセント色の行（任意） */
  accentNote?: string;
};

type SectionStyle = {
  dot: string;
  selectedCard: string;
  checkboxOn: string;
  accentNote: string;
};

// Tailwind は動的に組み立てたクラス名を検出できないため、
// 色ごとのクラス文字列はリテラルで定義する
const SECTION_STYLES = {
  accent: {
    dot: "text-accent",
    selectedCard: "border-accent bg-accent/10",
    checkboxOn: "border-accent bg-accent",
    accentNote: "text-accent/70",
  },
  blue: {
    dot: "text-blue-500",
    selectedCard: "border-blue-500 bg-blue-500/10",
    checkboxOn: "border-blue-500 bg-blue-500",
    accentNote: "text-blue-500/70",
  },
  purple: {
    dot: "text-purple-500",
    selectedCard: "border-purple-500 bg-purple-500/10",
    checkboxOn: "border-purple-500 bg-purple-500",
    accentNote: "text-purple-500/70",
  },
  emerald: {
    dot: "text-emerald-500",
    selectedCard: "border-emerald-500 bg-emerald-500/10",
    checkboxOn: "border-emerald-500 bg-emerald-500",
    accentNote: "text-emerald-500/70",
  },
} as const satisfies Record<string, SectionStyle>;

const SECTIONS: Array<{
  key: string;
  label: string;
  style: SectionStyle;
  options: StudioOption[];
}> = [
  {
    key: "buzz",
    label: "BUZZスタジオ（空き状況を表示）",
    style: SECTION_STYLES.accent,
    options: BUZZ_STUDIOS.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.location,
    })),
  },
  {
    key: "civic-hall",
    label: "福岡市民会館（部屋を個別に選択）",
    style: SECTION_STYLES.blue,
    options: CIVIC_HALL_ROOMS.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.parent,
      accentNote: r.location,
    })),
  },
  {
    key: "crea",
    label: "レンタルスタジオCREA（スタジオを個別に選択）",
    style: SECTION_STYLES.purple,
    options: CREA_STUDIOS.map((s) => ({
      id: s.id,
      name: s.name,
      description: `${s.floor} / ${s.size}`,
      accentNote: s.location,
    })),
  },
  {
    key: "instabase",
    label: "Instabase（スペースを個別に選択）",
    style: SECTION_STYLES.emerald,
    options: INSTABASE_SPACES.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.location,
    })),
  },
];

function StudioOptionCard({
  option,
  style,
  isSelected,
  onToggle,
}: {
  option: StudioOption;
  style: SectionStyle;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`
        flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected ? style.selectedCard : "border-border bg-card hover:border-muted"}
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="sr-only"
      />
      <div
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${isSelected ? style.checkboxOn : "border-muted"}
        `}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-background"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <div className="font-medium text-sm">{option.name}</div>
        <div className="text-xs text-muted">{option.description}</div>
        {option.accentNote && (
          <div className={`text-xs mt-0.5 ${style.accentNote}`}>
            {option.accentNote}
          </div>
        )}
      </div>
    </label>
  );
}

export function StudioSelections({ selectedStudios, toggleStudio }: Props) {
  return (
    <>
      {SECTIONS.map((section) => (
        <div key={section.key} className="mb-6">
          <label className="block text-sm text-muted mb-3">
            <span className={section.style.dot}>●</span> {section.label}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.options.map((option) => (
              <StudioOptionCard
                key={option.id}
                option={option}
                style={section.style}
                isSelected={selectedStudios.includes(option.id)}
                onToggle={() => toggleStudio(option.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
