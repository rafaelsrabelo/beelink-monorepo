// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { AddressSuggestion } from '@harness-monorepo/contracts';

/** One option in the panel's address box. Every field but the label may be empty — see the contract. */
export class AddressSuggestionResponse implements AddressSuggestion {
  @ApiProperty({ example: 'address.1234' }) id!: string;
  @ApiProperty({ example: 'Rua Lavras, 120, Aldeota, Fortaleza, CE' }) label!: string;
  @ApiProperty({ example: 'Rua Lavras da Mangabeira' }) street!: string;
  @ApiProperty({ example: '143', description: 'What the search matched; the shopkeeper may correct it.' }) number!: string;
  @ApiProperty({ example: 'Aldeota' }) neighborhood!: string;
  @ApiProperty({ example: 'Fortaleza' }) city!: string;
  @ApiProperty({ example: 'CE' }) state!: string;
  @ApiProperty({ example: '60170070' }) zipCode!: string;
  @ApiProperty({ example: -3.7436 }) latitude!: number;
  @ApiProperty({ example: -38.4998 }) longitude!: number;

  static from(suggestion: AddressSuggestion): AddressSuggestionResponse {
    return Object.assign(new AddressSuggestionResponse(), suggestion);
  }
}
