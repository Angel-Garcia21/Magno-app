
import { Property, PropertyStatus, TimelineEvent, BlogPost, User } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'owner@magno.com', name: 'Carlos Propietario', role: 'owner', propertyId: '1' },
  { id: 'u2', email: 'tenant@magno.com', name: 'Juan Inquilino', role: 'tenant', propertyId: '1' },
  { id: 'u3', email: 'alejandro.rivas@magnogi.com', name: 'Alejandro Rivas', role: 'admin' },
  { id: 'u4', email: 'angel.garcia@magnogi.com', name: 'Angel García', role: 'admin' },
  { id: 'u5', email: 'admin@magno.com', name: 'Admin Magno', role: 'admin' }
];

export const INITIAL_PROPERTY: Property = {
  id: '1',
  ref: 'MAG-ZAP-001',
  title: 'La Reserva 1093-20',
  address: 'La Reserva 1093, Zapopan, Jalisco',
  status: PropertyStatus.AVAILABLE,
  price: 18500,
  type: 'rent',
  maintenanceFee: 2400,
  specs: {
    beds: 3,
    baths: 2.5,
    parking: 2,
    area: 165,
    landArea: 200,
    age: 5,
    isVacant: true,
    hasLivingRoom: true,
    hasDiningRoom: true,
    hasTVRoom: false,
    pets: true
  },
  description: 'Departamento moderno en zona exclusiva con acabados de lujo, excelente iluminación natural y seguridad 24/7.',
  images: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800'
  ],
  accessCode: 'MAGNO-ADM-R10006',
  ownerId: 'u1',
  ownerName: 'Carlos Propietario',
  documents: [],
  services: ['Agua', 'Luz', 'Internet', 'Gas Natural'],
  amenities: ['Alberca', 'Gimnasio', 'Seguridad 24/7'],
  spaces: ['Cocina Integral', 'Patio de Servicio', 'Terraza'],
  // MapBox location data
  latitude: 20.6737, // Zapopan coordinates
  longitude: -103.3686,
  fullAddress: 'La Reserva 1093, Zapopan, Jalisco, México'
};

export const ALL_PROPERTIES: Property[] = [INITIAL_PROPERTY];

export const INITIAL_TIMELINE: TimelineEvent[] = [
  { id: 't1', title: 'Propiedad Publicada', description: 'El inmueble ya es visible para prospectos.', date: '2024-01-01', status: 'completed' }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'b1',
    title: 'Tendencias del Mercado Inmobiliario 2024',
    category: 'Análisis',
    excerpt: '¿Por qué Zapopan sigue siendo la mejor zona para invertir?',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800',
    date: 'Hoy'
  }
];


