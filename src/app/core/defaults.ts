import { LATEST_KEYWORD_VERSION } from './keyword-releases';
import { Settings } from './models';

export const YOUTUBE_CATEGORY = {
  FILM_AND_ANIMATION: '1',
  GAMING: '20',
  COMEDY: '23',
  ENTERTAINMENT: '24',
  NEWS_AND_POLITICS: '25',
  TRAILERS: '44',
} as const;

/** Default topic queries from earlier versions; a saved topic still using one gets the richer default above. */
export const LEGACY_DEFAULT_TOPIC_QUERIES: Readonly<Record<string, string>> = {
  'nau-an': 'hướng dẫn nấu ăn món ngon gia đình',
  'suc-khoe': 'bác sĩ tư vấn sức khỏe người cao tuổi',
  'du-lich': 'du lịch Việt Nam phong cảnh đẹp',
  'am-nhac': 'nhạc trữ tình xưa hay nhất',
  'lam-vuon': 'kinh nghiệm trồng rau làm vườn tại nhà',
};

export const DEFAULT_SETTINGS: Settings = {
  trustedChannels: [],
  topics: [
    {
      id: 'nau-an',
      label: 'Nấu ăn',
      query:
        'hướng dẫn nấu ăn món ngon gia đình; món kho đậm đà cơm nhà; các món canh dân dã; món chay dễ làm; ' +
        'làm bánh truyền thống Việt Nam; đặc sản ẩm thực ba miền; món ăn ngày Tết cổ truyền; cách muối dưa làm mắm',
    },
    {
      id: 'suc-khoe',
      label: 'Sức khỏe',
      query:
        'bác sĩ tư vấn sức khỏe người cao tuổi; bài tập thể dục cho người lớn tuổi; dưỡng sinh khí công buổi sáng; ' +
        'dinh dưỡng cho người cao tuổi; yoga nhẹ nhàng cho người lớn tuổi; ngủ ngon và thư giãn cho người lớn tuổi',
    },
    {
      id: 'du-lich',
      label: 'Du lịch',
      query:
        'du lịch Việt Nam phong cảnh đẹp; khám phá miền Tây sông nước; du lịch Sa Pa Hà Giang; cố đô Huế phố cổ Hội An; ' +
        'phố cổ Hà Nội xưa; biển đảo Việt Nam; chùa cổ Việt Nam; làng quê Việt Nam yên bình',
    },
    {
      id: 'am-nhac',
      label: 'Nhạc xưa',
      query:
        'nhạc trữ tình xưa hay nhất; nhạc vàng bolero; nhạc Trịnh Công Sơn; tân cổ giao duyên; nhạc tiền chiến; ' +
        'dân ca quan họ Bắc Ninh; trích đoạn cải lương xưa; nhạc quê hương dân ca ba miền',
    },
    {
      id: 'lam-vuon',
      label: 'Làm vườn',
      query:
        'kinh nghiệm trồng rau làm vườn tại nhà; trồng rau sạch trên sân thượng; chăm sóc cây ăn quả trong vườn; ' +
        'trồng hoa trong chậu; ủ phân hữu cơ tại nhà; chăm sóc cây cảnh bonsai; cuộc sống làng quê vườn tược',
    },
  ],
  bannedKeywords: [
    'sốc', 'phẫn nộ', 'bóc phốt', 'drama', 'nóng hổi', 'tin nóng', 'rúng động', 'chấn động',
    'lộ clip', 'toang', 'cực căng', 'bất ngờ với', 'không thể tin', 'sự thật về', 'tiên tri',
    'tâm linh', 'bói', 'tử vi', 'xổ số', 'soi cầu', 'giật mình', 'đánh ghen', 'cảnh báo khẩn',
    'thuyết âm mưu', 'minecraft', 'roblox', 'free fire', 'liên quân', 'đồ chơi', 'hoạt hình',
    'spiderman', 'elsa', 'prank', 'thử thách 24h', 'mukbang',
    'choáng', 'xót xa', 'bàn tán', 'dân mạng', 'gây bão', 'hé lộ', 'tiết lộ', 'bí mật động trời',
    'cảnh báo', 'nguy hại', 'sai lầm', 'chữa bệnh', 'chữa khỏi', 'bài thuốc', 'thần dược',
    'khỏi hẳn', 'không cần thuốc', 'bác sĩ cũng', 'dự án tỷ đô', 'bất động sản', 'kiếm tiền',
    'đầu tư', 'tiền ảo', 'lừa đảo', 'vạch trần',
    'xuyên không', 'xuyên thành', 'trọng sinh', 'ngôn tình', 'tổng tài', 'full có kết', 'full bộ',
    'review truyện', 'truyện audio', 'thần y', 'bá đạo', 'ác nữ', 'nữ phụ', 'phản diện', 'review phim',
    'tóm tắt phim', 'thế giới ngả mũ', 'thán phục',
    'thảm họa', 'bí truyền', 'tuyệt chiêu',
    'loại lá', 'chữa', 'trị dứt', 'dứt điểm', 'hết đau', 'hết bệnh', 'sống được bao lâu', 'dấu hiệu này',
  ],
  keywordsVersion: LATEST_KEYWORD_VERSION,
  blockedChannels: [],
  thresholds: {
    minDurationMinutes: 3,
    minSubscribersForUnknownChannel: 10000,
    minChannelAgeDays: 365,
    maxUppercaseRatio: 0.5,
  },
  language: { requireVietnamese: true },
  quietHours: { enabled: true, start: '23:00', end: '06:00' },
  display: { uiScale: 1, fullTitles: false, marqueeSpeed: 30, relatedFirstCount: 3 },
  playback: { autoFullscreenSeconds: 60, expandControlsSeconds: 30, captions: false, fullscreenControlsSeconds: 4 },
  blockedCategoryIds: [
    YOUTUBE_CATEGORY.FILM_AND_ANIMATION,
    YOUTUBE_CATEGORY.GAMING,
    YOUTUBE_CATEGORY.COMEDY,
    YOUTUBE_CATEGORY.ENTERTAINMENT,
    YOUTUBE_CATEGORY.NEWS_AND_POLITICS,
    YOUTUBE_CATEGORY.TRAILERS,
  ],
};
