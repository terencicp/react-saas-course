// First-run / settings overlay: OpenRouter API key + model picker. The model
// list is fetched live from OpenRouter (cached 24 h in settings) — nothing is
// hardcoded. The default is the free auto-router; students can switch to any
// model in the full list. When no key is saved yet the modal is not
// dismissable (onClose is undefined).
import { useEffect, useMemo, useState } from "react";
import { XIcon } from "./Icons";
import {
  DEFAULT_MODEL_ID,
  SMALL_CONTEXT_THRESHOLD,
  describeError,
  fetchModels,
  validateKey,
} from "./lib/openrouter";
import type { ModelInfo, Settings } from "./lib/storage";

const KEYS_URL = "https://openrouter.ai/keys";
const MODELS_TTL_MS = 24 * 60 * 60 * 1000;

const formatContext = (tokens: number): string =>
  tokens >= 1_000_000
    ? `${(tokens / 1_000_000).toFixed(1)}M ctx`
    : `${Math.round(tokens / 1000)}k ctx`;

const formatPrice = (perToken: string): string => {
  const perMillion = Number.parseFloat(perToken) * 1_000_000;
  return perMillion === 0 ? "free" : `$${perMillion.toFixed(2)}/M`;
};

function ModelRow({
  model,
  selected,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`ai-chat-model-row${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(model.id)}
    >
      <span className="ai-chat-model-name">{model.name}</span>
      <span className="ai-chat-model-meta">
        {formatContext(model.context_length)} ·{" "}
        {formatPrice(model.pricing.prompt)}
        {model.context_length < SMALL_CONTEXT_THRESHOLD && (
          <span
            className="ai-chat-model-warn"
            title="May not fit the full lesson context"
          >
            ⚠ small ctx
          </span>
        )}
      </span>
    </button>
  );
}

export default function SettingsModal({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings | null;
  onSave: (settings: Settings) => void;
  onClose?: () => void;
}) {
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [modelId, setModelId] = useState(settings?.modelId ?? DEFAULT_MODEL_ID);
  const [models, setModels] = useState<ModelInfo[] | null>(
    settings?.modelsCache?.models ?? null,
  );
  const [modelsError, setModelsError] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cache = settings?.modelsCache;
    if (cache && Date.now() - cache.fetchedAt < MODELS_TTL_MS) return;
    fetchModels(settings?.apiKey)
      .then((list) => {
        setModels(list);
        setModelsError(false);
      })
      .catch(() => setModelsError(models === null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The list stays hidden until the student searches — only matches show.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!models || !q) return [];
    return models
      .filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(q))
      .slice(0, 100);
  }, [models, filter]);

  const save = async () => {
    const key = apiKey.trim();
    if (!key) {
      setError("Paste your OpenRouter API key first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await validateKey(key);
      onSave({
        apiKey: key,
        modelId,
        modelsCache: models
          ? { fetchedAt: Date.now(), models }
          : settings?.modelsCache,
      });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-chat-settings-backdrop">
      <div className="ai-chat-settings" role="dialog" aria-label="AI settings">
        <header className="ai-chat-settings-header">
          <span>AI settings</span>
          {onClose && (
            <button
              type="button"
              className="ai-chat-icon-btn"
              aria-label="Close settings"
              onClick={onClose}
            >
              <XIcon />
            </button>
          )}
        </header>

        <label className="ai-chat-field">
          <span>OpenRouter API key</span>
          <input
            type="password"
            value={apiKey}
            placeholder="sk-or-…"
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <p className="ai-chat-settings-note">
          Stored locally.{" "}
          <a href={KEYS_URL} target="_blank" rel="noreferrer">
            How to get an API key
          </a>
        </p>

        <div className="ai-chat-field">
          <span>Model</span>
          {models === null && !modelsError && (
            <p className="ai-chat-settings-note">Loading model list…</p>
          )}
          {modelsError && (
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="vendor/model-id"
              title="Model list unavailable — enter a model id manually"
            />
          )}
          {models && (
            <>
              <input
                type="search"
                className="ai-chat-model-filter"
                value={filter}
                placeholder={`Search ${models.length} models…`}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filter.trim() ? (
                <div className="ai-chat-model-list">
                  {filtered.map((m) => (
                    <ModelRow
                      key={m.id}
                      model={m}
                      selected={m.id === modelId}
                      onSelect={setModelId}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="ai-chat-settings-note">
                      No models match “{filter}”.
                    </p>
                  )}
                </div>
              ) : (
                <p className="ai-chat-settings-note">
                  Using <strong>{modelId}</strong>. Type to switch model.
                </p>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="ai-chat-error" role="alert">
            {error}
          </p>
        )}

        <footer className="ai-chat-settings-footer">
          <button
            type="button"
            className="ai-chat-send"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Validating…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
