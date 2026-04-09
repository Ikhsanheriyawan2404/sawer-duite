export interface MenuUser {
  uuid?: string
  username?: string
}

export interface MenuItem {
  key: string
  label: string
  desc: string
  abbr: string
  to: string
  status: 'live' | 'soon'
  requiresUser?: boolean
}

export function buildMenuItems(): MenuItem[] {
  return [
    {
      key: 'home',
      label: 'Home',
      desc: 'Pantau performa & ringkasan dukungan',
      abbr: 'HM',
      to: '/home',
      status: 'live'
    },
    {
      key: 'payment-settings',
      label: 'Integrasi Pembayaran',
      desc: 'Atur DANA, GoPay, & QRIS Statis',
      abbr: 'IP',
      to: '/settings/payment',
      status: 'live'
    },
    {
      key: 'donation-packages',
      label: 'Paket Dukungan',
      desc: 'Buat pilihan nominal donasi favorit',
      abbr: 'PD',
      to: '/settings/donation-packages',
      status: 'live'
    },
    {
      key: 'overlay-alert',
      label: 'Overlay Notifikasi',
      desc: 'Personalisasi alert live stream',
      abbr: 'AL',
      to: '/settings/overlay/alert',
      status: 'live'
    },
    {
      key: 'overlay-queue',
      label: 'Overlay Antrean',
      desc: 'Tampilkan daftar dukungan aktif',
      abbr: 'QA',
      to: '/settings/overlay/queue',
      status: 'live'
    },
    {
      key: 'overlay-list',
      label: 'Overlay List',
      desc: 'Daftar donatur',
      abbr: 'OL',
      to: '/settings/overlay/list',
      status: 'live'
    },
    {
      key: 'overlay-qr',
      label: 'Overlay QR',
      desc: 'Tampilkan QR profil untuk donasi',
      abbr: 'QR',
      to: '/settings/overlay/qr',
      status: 'live'
    },
    {
      key: 'overlay-media',
      label: 'MediaShare',
      desc: 'Video & audio',
      abbr: 'MS',
      to: '/settings/overlay/media',
      status: 'soon',
      requiresUser: true
    },
    {
      key: 'goals',
      label: 'Goal',
      desc: 'Visualisasikan progress target donasi',
      abbr: 'GL',
      to: '/settings/overlay/goal',
      status: 'live'
    },
    {
      key: 'analytics',
      label: 'Analytics',
      desc: 'Statistik performa',
      abbr: 'AN',
      to: '/analytics',
      status: 'live'
    },
    {
      key: 'settings',
      label: 'Pengaturan',
      desc: 'Atur minimal donasi dan preferensi lainnya',
      abbr: 'PG',
      to: '/settings',
      status: 'live'
    },
  ]
}
