export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// User Activity enums
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

// For summary aggregation mapping
export const GenderMapping = {
  [Gender.MALE]: 'male',
  [Gender.FEMALE]: 'female',
  [Gender.OTHER]: 'other'
} as const;

export enum DeviceBrand {
  SAMSUNG = 'Samsung',
  APPLE = 'Apple',
  HUAWEI = 'Huawei',
  XIAOMI = 'Xiaomi',
  OPPO = 'Oppo',
  VIVO = 'Vivo',
  OTHER = 'Other'
}

// For summary aggregation mapping
export const DeviceBrandMapping = {
  [DeviceBrand.SAMSUNG]: 'samsung',
  [DeviceBrand.APPLE]: 'apple',
  [DeviceBrand.HUAWEI]: 'huawei',
  [DeviceBrand.XIAOMI]: 'xiaomi',
  [DeviceBrand.OPPO]: 'oppo',
  [DeviceBrand.VIVO]: 'vivo',
  [DeviceBrand.OTHER]: 'other'
} as const;

export enum DigitalInterest {
  SOCIAL_MEDIA = 'Social Media',
  GAMING = 'Gaming',
  SHOPPING = 'Shopping',
  NEWS = 'News',
  ENTERTAINMENT = 'Entertainment',
  EDUCATION = 'Education',
  HEALTH = 'Health',
  FINANCE = 'Finance',
  TRAVEL = 'Travel',
  FOOD = 'Food',
  OTHER = 'Other'
}

// For summary aggregation mapping
export const DigitalInterestMapping = {
  [DigitalInterest.SOCIAL_MEDIA]: 'socialMedia',
  [DigitalInterest.GAMING]: 'gaming',
  [DigitalInterest.SHOPPING]: 'shopping',
  [DigitalInterest.NEWS]: 'news',
  [DigitalInterest.ENTERTAINMENT]: 'entertainment',
  [DigitalInterest.EDUCATION]: 'education',
  [DigitalInterest.HEALTH]: 'health',
  [DigitalInterest.FINANCE]: 'finance',
  [DigitalInterest.TRAVEL]: 'travel',
  [DigitalInterest.FOOD]: 'food',
  [DigitalInterest.OTHER]: 'other'
} as const;

export enum LocationType {
  URBAN = 'urban',
  SUBURBAN = 'sub urban',
  RURAL = 'rural'
}

// For summary aggregation mapping
export const LocationTypeMapping = {
  [LocationType.URBAN]: 'urban',
  [LocationType.SUBURBAN]: 'suburban',
  [LocationType.RURAL]: 'rural'
} as const;