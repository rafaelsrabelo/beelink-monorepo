// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsString, IsUrl, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// Types
import type { PopupBenefitSource, PopupErrorCode, PopupTrigger, StorePopupPayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { blankToNull } from '../../stores/dto/store-fields.dto.js';
import { plainTextOf, POPUP_BENEFIT_SOURCES, POPUP_BUTTON_MAX, POPUP_DELAY_MAX_SECONDS, POPUP_TEXT_MAX, POPUP_TITLE_MAX, POPUP_TRIGGERS } from '../shop-popup.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const INVALID = { context: { errorCode: 'POPUP_SETTINGS_INVALID' satisfies PopupErrorCode } };

const plainText = Transform(({ value }: { value: unknown }) => plainTextOf(value));
/** Null is an answer — the product's default, no image, nothing named — and so is sent; only a missing key is refused. */
const unlessNull = ValidateIf((_, value) => value !== null);

/** The whole of the form: it saves together, and a key left out is refused rather than reset. */
export class StorePopupDto implements StorePopupPayload {
  @ApiProperty()
  @IsBoolean(INVALID)
  enabled!: boolean;

  @ApiProperty({ nullable: true, type: String, description: 'http(s) only; null draws the coloured panel alone.' })
  @blankToNull
  @unlessNull
  // A picture the shop window renders in `src`: anything but http(s) is a script waiting to run.
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, INVALID)
  @MaxLength(2048, INVALID)
  imageUrl!: string | null;

  @ApiProperty({ nullable: true, type: String, maxLength: POPUP_TITLE_MAX, example: 'Ganhe {beneficio} na primeira compra', description: 'Plain text; null is the default. May carry {beneficio}, never a discount typed by hand.' })
  @plainText
  @unlessNull
  @IsString(INVALID)
  @MaxCodePoints(POPUP_TITLE_MAX, INVALID)
  title!: string | null;

  @ApiProperty({ nullable: true, type: String, maxLength: POPUP_TEXT_MAX, description: 'As title.' })
  @plainText
  @unlessNull
  @IsString(INVALID)
  @MaxCodePoints(POPUP_TEXT_MAX, INVALID)
  text!: string | null;

  @ApiProperty({ nullable: true, type: String, maxLength: POPUP_BUTTON_MAX, description: 'As title.' })
  @plainText
  @unlessNull
  @IsString(INVALID)
  @MaxCodePoints(POPUP_BUTTON_MAX, INVALID)
  buttonLabel!: string | null;

  @ApiProperty({ enum: POPUP_TRIGGERS })
  @IsIn(POPUP_TRIGGERS, INVALID)
  trigger!: PopupTrigger;

  @ApiProperty({ minimum: 0, maximum: POPUP_DELAY_MAX_SECONDS, example: 5, description: 'Seconds after the page arrives; read on ON_ARRIVAL alone.' })
  @IsInt(INVALID)
  @Min(0, INVALID)
  @Max(POPUP_DELAY_MAX_SECONDS, INVALID)
  delaySeconds!: number;

  @ApiProperty({ enum: POPUP_BENEFIT_SOURCES, description: "AUTO follows the shop's first-purchase headline." })
  @IsIn(POPUP_BENEFIT_SOURCES, INVALID)
  benefitSource!: PopupBenefitSource;

  @ApiProperty({ nullable: true, type: String, format: 'uuid', description: "The promotion's or the coupon's id; null on AUTO." })
  @unlessNull
  @IsString(INVALID)
  @MaxLength(36, INVALID)
  benefitId!: string | null;

  @ApiProperty({ description: 'Whether the offer strip stays under the header once the pop-up was closed, until the strip is closed too. Off — the default — the shop draws no strip while the pop-up is on.' })
  @IsBoolean(INVALID)
  keepReminder!: boolean;
}
