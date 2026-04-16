interface SocialLinks {
  tiktok?: string
  instagram?: string
  youtube?: string
  facebook?: string
}

interface MeResponse {
  id?: number
  uuid?: string
  email?: string
  username?: string
  app_token?: string
  created_at?: string
  updated_at?: string
  profile?: {
    name?: string
    bio?: string
    social_links?: SocialLinks
  }
  config?: {
    min_donation?: number
    quick_amounts?: number[]
    donation_packages?: { label: string; amount: number }[]
    custom_input_schema?: CustomField[]
    custom_input_label?: string
    custom_input_required?: boolean
    queue_title?: string
  }
  custom_input_schema?: CustomField[]
  payment?: {
    static_qris?: string
    provider?: string
  }
}

export interface CustomField {
  key: string
  label: string
  required: boolean
  required_error?: string
}

export interface NormalizedUser {
  id: number
  uuid: string
  email: string
  username: string
  name: string
  bio: string
  avatar_url: string
  tiktok: string
  instagram: string
  youtube: string
  min_donation: number
  active_goal: {
    id: number
    title: string
    target_amount: number
    current_amount: number
    is_active: boolean
    starts_at?: string | null
    ends_at?: string | null
  } | null
  quick_amounts: number[]
  donation_packages: { label: string; amount: number }[]
  custom_input_schema: CustomField[]
  queue_title: string
  static_qris: string
  provider: string
  app_token: string
  alert_config: {}
  queue_config: {
    queue_title: string
  }
  list_config: {
    title: string
    sort_by?: string
    limit?: number
    aggregation_type?: string
    starts_at?: string | null
    ends_at?: string | null
  }
  qr_config: {
    top_text: string
    bottom_text: string
  }
  media_config: {
    enabled: boolean
  }
  created_at: string
  updated_at: string
}

const emptyUser: NormalizedUser = {
  id: 0,
  uuid: '',
  email: '',
  username: '',
  name: '',
  bio: '',
  avatar_url: '',
  tiktok: '',
  instagram: '',
  youtube: '',
  min_donation: 0,
  active_goal: null,
  quick_amounts: [],
  donation_packages: [],
  custom_input_schema: [],
  queue_title: '',
  static_qris: '',
  provider: 'DANA',
  app_token: '',
  alert_config: {},
  queue_config: {
    queue_title: 'Antrean Donasi'
  },
  list_config: {
    title: 'Daftar Donatur',
    sort_by: 'created_at_desc',
    limit: 10,
    aggregation_type: 'transaction',
    starts_at: null,
    ends_at: null
  },
  qr_config: {
    top_text: 'Dukung Saya',
    bottom_text: 'Scan QR untuk donasi'
  },
  media_config: {
    enabled: true
  },
  created_at: '',
  updated_at: ''
}

export function normalizeMeUser(raw: MeResponse | any): NormalizedUser {
  if (!raw) return { ...emptyUser }

  const social = raw.profile?.social_links || raw.social_links || {}

  return {
    ...emptyUser,
    id: raw.id ?? 0,
    uuid: raw.uuid ?? '',
    email: raw.email ?? '',
    username: raw.username ?? '',
    name: raw.name ?? raw.profile?.name ?? '',
    bio: raw.bio ?? raw.profile?.bio ?? '',
    avatar_url: raw.avatar_url ?? raw.profile?.avatar_url ?? '',
    tiktok: raw.tiktok ?? social.tiktok ?? '',
    instagram: raw.instagram ?? social.instagram ?? '',
    youtube: raw.youtube ?? social.youtube ?? '',
    min_donation: raw.min_donation ?? raw.config?.min_donation ?? 0,
    active_goal: raw.active_goal ?? null,
    quick_amounts: raw.quick_amounts ?? raw.config?.quick_amounts ?? [],
    donation_packages: raw.donation_packages ?? raw.config?.donation_packages ?? [],
    custom_input_schema: raw.custom_input_schema ?? raw.config?.custom_input_schema ?? [],
    queue_title: raw.queue_title ?? raw.queue_config?.queue_title ?? '',
    static_qris: raw.static_qris ?? raw.payment?.static_qris ?? '',
    provider: raw.provider ?? raw.payment?.provider ?? 'DANA',
    app_token: raw.app_token ?? '',
    alert_config: raw.alert_config ?? raw.config?.alert_config ?? emptyUser.alert_config,
    queue_config: raw.queue_config ?? raw.config?.queue_config ?? emptyUser.queue_config,
    list_config: raw.list_config ?? emptyUser.list_config,
    qr_config: raw.qr_config ?? emptyUser.qr_config,
    media_config: raw.media_config ?? emptyUser.media_config,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? ''
  }
}
