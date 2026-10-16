export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  whatsapp: string | null
  bio: string | null
  avatar_url: string | null
  role: 'customer' | 'photographer' | 'admin'
  created_at: string
}

export type Photographer = {
  id: string
  user_id: string
  slug: string
  display_name: string
  bio: string | null
  city: string | null
  full_location: string | null
  experience_years: number | null
  equipment: string | null
  languages: string | null
  starting_price: number | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  profile_status: 'pending' | 'approved' | 'blocked' | 'banned'
  verified: boolean
  rating_avg: number | null
  rating_count: number | null
  profile_views: number | null
  home_spot: string | null
  phone: string | null
  whatsapp: string | null
  service_areas: string | null
  details?: {
    specialties?: string[]
    covered_spots?: string[]
    delivery_days?: number
    gear?: { camera?: string; lenses?: string; extras?: string[] }
    social_links?: { facebook?: string; instagram?: string }
  } | null
  photographer_categories?: { category_id: number; categories?: { name: string; slug: string; icon: string } }[]
}

export type Category = { id: number; name: string; slug: string; icon: string }

export type PackageMedia = { url: string; type: 'image' | 'video'; thumb_url?: string }

export type Package = {
  id: string
  photographer_id: string
  name: string
  description: string | null
  price: number
  duration_hours: number | null
  features: string[]
  media?: PackageMedia[]
  sort_order?: number
  is_popular?: boolean
}

export type PortfolioImage = { id: string; photographer_id: string; url: string; caption: string | null; sort_order: number }

export type Booking = {
  id: string
  photographer_id: string
  customer_id: string
  package_id: string | null
  event_date: string
  event_time: string | null
  event_location: string | null
  notes: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'
  package_snapshot?: { name: string; price: number; duration_hours?: number | null; cover_url?: string | null; features_count?: number } | null
  shoot_spot?: string | null
  shoot_time_slot?: string | null
  status_history?: { status: string; at: string; note?: string }[]
  cancellation_reason?: string | null
  created_at: string
  photographers?: Partial<Photographer>
  packages?: Partial<Package>
  profiles?: Partial<Profile>
}

export type Review = {
  id: string
  booking_id: string
  photographer_id: string
  customer_id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: Partial<Profile>
}

export type Notification = { id: string; user_id: string; type: string | null; message: string | null; link: string | null; read: boolean; created_at: string }

export type CommunityMessage = {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  body: string
  created_at: string
}

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  cover_url: string | null
  content: string
  author: string
  tags: string[]
  published: boolean
  created_at: string
  travel_data?: TravelData | null
}

/* ── structured Cox's Bazar travel guide (blog_posts.travel_data) ── */
export type TravelQuickFacts = {
  entry_fee?: string
  distance_from_town?: string
  best_season?: string
  safety_or_tide_note?: string
}

export type RentRow = { label: string; value: string; note?: string }
export type FoodRow = { name: string; price: string; recommended_spot?: string }
export type CaptionedPhoto = { url: string; caption?: string; price_range?: string }

export type TravelData = {
  spot_key?: string | null
  quick_facts?: TravelQuickFacts
  rent_rows?: RentRow[]
  food_rows?: FoodRow[]
  time_note?: string
  photo_spots?: string[]
  hotel_photos?: CaptionedPhoto[]
  gallery?: CaptionedPhoto[]
  tips?: string[]
}

/* ── Photographer POSTS (feed-style, admin-approved) ── */
export type PostMedia = { url: string; type: 'image' | 'video' }

export type Post = {
  id: string
  photographer_id: string
  title: string
  body: string | null
  price: number | null
  media: PostMedia[]
  status: 'pending' | 'approved' | 'rejected'
  review_note: string | null
  like_count: number
  created_at: string
  updated_at: string
  photographers?: Partial<Photographer>
  post_likes?: { user_id: string }[]
}
