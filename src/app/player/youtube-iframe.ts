export const PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  destroy(): void;
}

interface YtPlayerOptions {
  videoId: string;
  host: string;
  width: string;
  height: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YtNamespace {
  Player: new (element: HTMLElement, options: YtPlayerOptions) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YtNamespace> | null = null;

export function loadYoutubeIframeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YtNamespace>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => (window.YT ? resolve(window.YT) : reject(new Error('YT missing')));
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      loading = null;
      reject(new Error('YouTube iframe API failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function createPlayer(yt: YtNamespace, element: HTMLElement, videoId: string, events: YtPlayerOptions['events']): YtPlayer {
  return new yt.Player(element, {
    videoId,
    host: 'https://www.youtube-nocookie.com',
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      playsinline: 1,
      disablekb: 1,
      cc_load_policy: 0,
      hl: 'vi',
      origin: window.location.origin,
    },
    events,
  });
}
