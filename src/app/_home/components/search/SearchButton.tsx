"use client";

type Props = {
  fetchData: () => void;
  loading: boolean;
  disabled: boolean;
};

export function SearchButton({ fetchData, loading, disabled }: Props) {
  return (
    <div className="lg:col-span-2 flex items-end">
      <button
        onClick={fetchData}
        disabled={disabled}
        className={`
                  w-full px-8 py-3 rounded-lg font-semibold transition-all
                  ${
                    disabled
                      ? "bg-muted/20 text-muted cursor-not-allowed"
                      : "bg-accent text-background hover:bg-accent/90"
                  }
                `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            検索中...
          </span>
        ) : (
          "検索"
        )}
      </button>
    </div>
  );
}

