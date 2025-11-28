import type { Product, PublicConfig } from '../types';

export const mockPublicConfig: PublicConfig = {
  payment_qr_url: 'https://placehold.co/300x300?text=Pay',
  customer_service_qr: 'https://placehold.co/300x300?text=Service',
  home_slider: [
    {
      img: 'https://placehold.co/750x320?text=Banner+1',
      link: ''
    },
    {
      img: 'https://placehold.co/750x320?text=Banner+2',
      link: ''
    }
  ]
};

export const mockProducts: Product[] = [
  {
    id: 1001,
    name: 'Organic Daohuaxiang Rice',
    type: 'variable',
    description: 'Premium Wuchang rice with soft texture and natural aroma.',
    image_url: 'https://placehold.co/200x200?text=Rice',
    variations: [
      {
        variation_id: 1001001,
        attributes: { Spec: '5kg Bag' },
        price: '128.00',
        in_stock: true
      },
      {
        variation_id: 1001002,
        attributes: { Spec: '10kg Gift Box' },
        price: '238.00',
        in_stock: true
      }
    ]
  },
  {
    id: 1002,
    name: 'Organic Brown Rice Gift Box',
    type: 'variable',
    description: 'Low temperature drying keeps nutrition intact for daily meals.',
    image_url: 'https://placehold.co/200x200?text=Brown+Rice',
    variations: [
      {
        variation_id: 1002001,
        attributes: { Spec: '4kg Gift Box' },
        price: '198.00',
        in_stock: true
      }
    ]
  }
];
