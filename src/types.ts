export interface User {
  id: number;
  nickname: string;
  pin: string;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
}

export interface PrayerRequest {
  id: number;
  user_id: number;
  group_id: number | null;
  content: string;
  original_content: string | null;
  is_answered: number;
  created_at: string;
  updated_at: string;
  user_nickname: string;
  group_name: string | null;
  pray_count: number;
  comment_count?: number;
  user_has_prayed?: boolean;
  answered_note?: string | null;
}

export interface Comment {
  id: number;
  prayer_request_id: number;
  user_id: number;
  type: "COMMENT";
  content: string;
  created_at: string;
  user_nickname: string;
}
