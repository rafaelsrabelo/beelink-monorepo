// App
import { cartRequestOf, labelBlockersOf, type LabelSources } from './label-parties.js';

const sources: LabelSources = {
  order: {
    number: 12,
    status: 'ACCEPTED',
    fulfillment: 'DELIVERY',
    deliveryName: 'Bia Cliente',
    deliveryZipCode: '30140071',
    deliveryStreet: 'Rua da Bahia',
    deliveryNumber: '1148',
    deliveryComplement: ' ',
    deliveryNeighborhood: 'Centro',
    deliveryCity: 'Belo Horizonte',
    deliveryState: 'MG',
    deliveryDocument: '52998224725',
    customer: { name: 'Bia', phone: '5511988887777' },
    items: [
      { productName: 'Blusa', variantLabel: 'Cor: Azul', quantity: 2, lineTotalCents: 11980, discountCents: 1198 },
      { productName: 'Saia', variantLabel: null, quantity: 1, lineTotalCents: 8990, discountCents: 0 },
    ],
    delivery: { kind: 'CARRIER', carrier: 'Correios', service: 'SEDEX', carrierServiceId: 2 },
  },
  store: {
    name: 'Loja Lessari',
    whatsappPhone: '5511999998888',
    addressStreet: 'Rua Augusta',
    addressNumber: '1500',
    addressComplement: null,
    addressNeighborhood: 'Consolação',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310930',
  },
  senderDocument: '11222333000181',
  senderStateRegister: null,
  account: { email: 'loja@lessari.com.br' },
};

describe('the label as its parts say it (BEELINK-187)', () => {
  it('stands nothing in the way of an order of a carrier with everything a label needs', () => {
    expect(labelBlockersOf(sources)).toEqual([]);
  });

  it('says what is missing, every one of it', () => {
    const missing = {
      ...sources,
      order: { ...sources.order, status: 'CANCELLED', deliveryDocument: null, deliveryNumber: null, delivery: { ...sources.order.delivery!, kind: 'OWN', carrierServiceId: null } },
      store: { ...sources.store, addressNeighborhood: '  ' },
      senderDocument: null,
      account: null,
    };

    expect(labelBlockersOf(missing)).toEqual(['NOT_CARRIER', 'ORDER_CANCELLED', 'NOT_CONNECTED', 'NO_SENDER_DOCUMENT', 'NO_ORIGIN', 'NO_RECIPIENT_DOCUMENT', 'RECIPIENT_ADDRESS_INCOMPLETE']);
  });

  it('sends from the shop to who the order is for, one box in centimetres and kilograms, the lines at what was paid', () => {
    const request = cartRequestOf(sources, { weightGrams: 650, lengthMm: 255, widthMm: 200, heightMm: 81 }, null);

    expect(request).toMatchObject({
      serviceId: 2,
      from: { name: 'Loja Lessari', phone: '11999998888', email: 'loja@lessari.com.br', document: '11222333000181', street: 'Rua Augusta', district: 'Consolação', zipCode: '01310930' },
      to: { name: 'Bia Cliente', phone: '11988887777', email: null, document: '52998224725', complement: null, district: 'Centro', zipCode: '30140071' },
      products: [
        { name: 'Blusa (Cor: Azul)', quantity: 2, unitReais: 53.91 },
        { name: 'Saia', quantity: 1, unitReais: 89.9 },
      ],
      volume: { lengthCm: 26, widthCm: 20, heightCm: 9, weightKg: 0.65 },
      insuranceReais: 197.72,
      invoiceKey: null,
      tag: '#12',
    });
  });
});
