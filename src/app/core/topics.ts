import { Settings, Topic } from './models';

export interface TopicDraft {
  readonly label: string;
  readonly query: string;
}

export function normalizeTopicDraft(draft: TopicDraft): TopicDraft | null {
  const label = draft.label.trim();
  const query = draft.query.trim() || label;
  return label ? { label, query } : null;
}

export function topicIdFor(label: string, taken: ReadonlySet<string>): string {
  const base =
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'chu-de';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function addTopic(settings: Settings, draft: TopicDraft): Settings {
  const clean = normalizeTopicDraft(draft);
  if (!clean) return settings;
  const topic: Topic = { id: topicIdFor(clean.label, new Set(settings.topics.map((t) => t.id))), ...clean };
  return { ...settings, topics: [...settings.topics, topic] };
}

export function editTopic(settings: Settings, id: string, draft: TopicDraft): Settings {
  const clean = normalizeTopicDraft(draft);
  if (!clean) return settings;
  return { ...settings, topics: settings.topics.map((t) => (t.id === id ? { ...t, ...clean } : t)) };
}
