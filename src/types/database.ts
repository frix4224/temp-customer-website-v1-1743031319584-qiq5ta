export interface Service {
  id: string;
  name: string;
  description: string | null;
  short_description: string;
  icon: string;
  image_url: string | null;
  price_starts_at: number;
  price_unit: string;
  features: string[];
  benefits: string[];
  service_identifier: string;
  color_scheme: {
    primary: string;
    secondary: string;
  };
  sequence: number;
  is_popular: boolean;
  status: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sequence: number;
  status: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_custom_price: boolean;
  is_popular: boolean;
  sequence: number;
  status: boolean;
  created_at: string;
}