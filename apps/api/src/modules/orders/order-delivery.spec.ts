// App
import { deliveryColumnsOf, toDeliveryAddress, type CustomerAddressRow } from './order-delivery.js';

const bia: CustomerAddressRow = {
  name: 'Bia Souza',
  zipCode: '01310-930',
  street: 'Av. Paulista',
  number: '1000',
  complement: 'apto 12',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

describe('deliveryColumnsOf', () => {
  it('photographs the whole record, and the name as who receives it', () => {
    expect(deliveryColumnsOf(bia)).toEqual({
      deliveryName: 'Bia Souza',
      deliveryZipCode: '01310-930',
      deliveryStreet: 'Av. Paulista',
      deliveryNumber: '1000',
      deliveryComplement: 'apto 12',
      deliveryNeighborhood: 'Bela Vista',
      deliveryCity: 'São Paulo',
      deliveryState: 'SP',
    });
  });

  it('delivers to a street and a city alone, as the shop window reads an address', () => {
    const bare = { ...bia, zipCode: null, number: null, complement: null, neighborhood: null, state: null };
    expect(deliveryColumnsOf(bare)).toMatchObject({ deliveryStreet: 'Av. Paulista', deliveryCity: 'São Paulo', deliveryNumber: null });
  });

  it('has nowhere to deliver without a street or without a city, and spaces are not a street', () => {
    expect(deliveryColumnsOf({ ...bia, street: null })).toBeNull();
    expect(deliveryColumnsOf({ ...bia, city: null })).toBeNull();
    expect(deliveryColumnsOf({ ...bia, street: '   ' })).toBeNull();
  });

  it('keeps no part saved as spaces', () => {
    expect(deliveryColumnsOf({ ...bia, complement: '  ', street: ' Av. Paulista ' })).toMatchObject({
      deliveryComplement: null,
      deliveryStreet: 'Av. Paulista',
    });
  });
});

describe('toDeliveryAddress', () => {
  it('reads the columns back as the wire names them', () => {
    const { name, ...address } = bia;
    expect(toDeliveryAddress(deliveryColumnsOf(bia)!)).toEqual({ ...address, recipientName: name });
  });

  it('is null on columns never written: a pick-up, or a delivery from before orders kept it', () => {
    const none = {
      deliveryName: null,
      deliveryZipCode: null,
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
    };
    expect(toDeliveryAddress(none)).toBeNull();
  });
});
