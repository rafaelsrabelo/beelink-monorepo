// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { OrderLabelOverview, OrderLabelPrint } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../../auth/auth.decorators.js';
import { CurrentUser } from '../../../auth/auth.decorators.js';
import { OrderNumberPipe } from '../../../orders/order-number.pipe.js';
import { BuyOrderLabelDto, OrderLabelOverviewResponse, OrderLabelPrintResponse } from './dto/order-label.dto.js';
import { OrderLabels } from './order-labels.service.js';

/** An order's shipping label (BEELINK-187), bought, printed and cancelled from the panel's order. */
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/orders/:number/label')
export class OrderLabelsController {
  constructor(private readonly labels: OrderLabels) {}

  @Get()
  @ApiOperation({ summary: "The order's label, what buying one needs, the wallet and the box Melhor Envio would pack it in" })
  @ApiOkResponse({ type: OrderLabelOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @Param('number', OrderNumberPipe) number: number, @CurrentUser() current: AuthenticatedUser): Promise<OrderLabelOverview> {
    return this.labels.overview(storeSlug, current.id, number);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Buy the label from the shop's wallet — or carry on buying it: into the cart, paid, generated" })
  @ApiOkResponse({ type: OrderLabelOverviewResponse })
  @ApiBadRequestResponse({ description: 'LABEL_INVALID' })
  @ApiConflictResponse({ description: 'LABEL_NOT_AVAILABLE · LABEL_BALANCE_INSUFFICIENT · LABEL_REFUSED · INTEGRATION_NOT_CONNECTED · INTEGRATION_NEEDS_RECONNECT' })
  @ApiBadGatewayResponse({ description: 'INTEGRATION_UNREACHABLE' })
  buy(@Param('storeSlug') storeSlug: string, @Param('number', OrderNumberPipe) number: number, @CurrentUser() current: AuthenticatedUser, @Body() dto: BuyOrderLabelDto): Promise<OrderLabelOverview> {
    return this.labels.buy(storeSlug, current.id, number, dto);
  }

  @Post('print')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The label's PDF, at a public address made there and then" })
  @ApiOkResponse({ type: OrderLabelPrintResponse })
  @ApiConflictResponse({ description: 'LABEL_NOT_GENERATED · LABEL_REFUSED' })
  print(@Param('storeSlug') storeSlug: string, @Param('number', OrderNumberPipe) number: number, @CurrentUser() current: AuthenticatedUser): Promise<OrderLabelPrint> {
    return this.labels.print(storeSlug, current.id, number);
  }

  @Delete()
  @ApiOperation({ summary: 'Cancel the label while Melhor Envio allows it — its value goes back to the wallet — or take it out of the cart' })
  @ApiOkResponse({ type: OrderLabelOverviewResponse })
  @ApiConflictResponse({ description: 'LABEL_NOT_CANCELLABLE · LABEL_REFUSED' })
  cancel(@Param('storeSlug') storeSlug: string, @Param('number', OrderNumberPipe) number: number, @CurrentUser() current: AuthenticatedUser): Promise<OrderLabelOverview> {
    return this.labels.cancel(storeSlug, current.id, number);
  }
}
