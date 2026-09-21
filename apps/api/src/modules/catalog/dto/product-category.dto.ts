// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Types
import type {
  CreateProductCategoryPayload,
  ShowcaseLayout,
  UpdateProductCategoryPayload,
} from '@harness-monorepo/contracts';

// App
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SLUG_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  SHOWCASE_LAYOUTS,
} from '../catalog.constants.js';
import { blankToNull, imageUrl, trim } from '../../stores/dto/store-fields.dto.js';

/**
 * `slug` carries no `@Matches(SLUG_PATTERN)`, unlike a shop's: CatalogSlugService normalises what
 * arrives rather than refusing it, so a shopkeeper who types "Blusas!" gets `blusas` instead of a
 * validation message about a pattern they never saw. What it cannot normalise — a name that leaves
 * nothing addressable, or a reserved word — is refused there, with a code the panel has words for.
 */
export class CreateProductCategoryDto implements CreateProductCategoryPayload {
  @ApiProperty({ example: 'Blusas', minLength: 2, maxLength: CATEGORY_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(2)
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiPropertyOptional({
    example: 'blusas',
    maxLength: CATEGORY_SLUG_MAX_LENGTH,
    description: 'Absent derives it from the name. Normalised either way.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CATEGORY_SLUG_MAX_LENGTH)
  @trim
  slug?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @imageUrl
  @blankToNull
  imageUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'The category this goes under. Null or absent is a top level; there is no third.',
  })
  @IsOptional()
  @IsUUID()
  @blankToNull
  parentId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: SHOWCASE_LAYOUTS,
    description: 'The shape it takes on the landing page. Null keeps it off that page.',
  })
  @IsOptional()
  @IsIn(SHOWCASE_LAYOUTS)
  @blankToNull
  showcaseLayout?: ShowcaseLayout | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Every field optional. The panel edits one category in a dialog, and a key it leaves out is a key
 * the shopkeeper did not open — so this is a patch, unlike the shop's own update, which is a full
 * replacement because that form posts all five of its tabs at once.
 */
export class UpdateProductCategoryDto
  extends CreateProductCategoryDto
  implements UpdateProductCategoryPayload
{
  @ApiPropertyOptional({ example: 'Blusas', minLength: 2, maxLength: CATEGORY_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  @trim
  declare name: string;
}
