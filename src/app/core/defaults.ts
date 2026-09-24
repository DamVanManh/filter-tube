import { Settings } from './models';

export const DEFAULT_SETTINGS: Settings = {
  trustedChannels: [],
  topics: [
    { id: 'nau-an', label: 'Nấu ăn', query: 'hướng dẫn nấu ăn món ngon gia đình' },
    { id: 'suc-khoe', label: 'Sức khỏe', query: 'bác sĩ tư vấn sức khỏe người cao tuổi' },
    { id: 'du-lich', label: 'Du lịch', query: 'du lịch Việt Nam phong cảnh đẹp' },
    { id: 'am-nhac', label: 'Nhạc xưa', query: 'nhạc trữ tình xưa hay nhất' },
    { id: 'lam-vuon', label: 'Làm vườn', query: 'kinh nghiệm trồng rau làm vườn tại nhà' },
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
  ],
  blockedChannels: [],
  thresholds: {
    minDurationMinutes: 3,
    minSubscribersForUnknownChannel: 10000,
    minChannelAgeDays: 365,
    maxUppercaseRatio: 0.5,
  },
  language: { requireVietnamese: true },
};
