export const BUSINESS_PROFILE_RECOMMENDED_FIELDS = [
  { key: 'sector', label: 'Sektör', priority: 100 },
  { key: 'city', label: 'Şehir', priority: 90 },
  { key: 'businessStage', label: 'İşletme Aşaması', priority: 80 },
  { key: 'employeeCount', label: 'Çalışan Sayısı', priority: 70 },
  { key: 'salesChannels', label: 'Satış Kanalları', priority: 60 },
  { key: 'primaryGoal', label: 'Öncelikli Hedef', priority: 50 },
];

export const FINANCIAL_TOOL_REGISTRY = [
  {
    code: 'break-even',
    title: 'Başabaş Noktası Analizi',
    route: '/app/finance/models/break-even',
    enabled: true,
    supportedRoles: ['learner', 'student', 'founder', 'manager'],
  },
  {
    code: 'cash-flow',
    title: 'Nakit Akış Projeksiyonu',
    route: '/app/finance/models/cash-flow',
    enabled: true,
    supportedRoles: ['learner', 'student', 'founder', 'manager'],
  },
  {
    code: 'unit-economics',
    title: 'Birim Ekonomi Analizi',
    route: '/app/finance/models/unit-economics',
    enabled: true,
    supportedRoles: ['learner', 'student', 'founder', 'manager'],
  }
];
