import { ApiProperty } from "@nestjs/swagger";
import { BUYER_PARTIES, PAYMENT_METHODS, type BuyerParty, type PaymentMethod } from "@wave/shared";
import { IsIn } from "class-validator";

export class SendBillingDto {
  @ApiProperty({ enum: BUYER_PARTIES, description: "A quién se factura: la empresa o el contacto." })
  @IsIn(BUYER_PARTIES, { message: "Elige a quién facturar." })
  buyer!: BuyerParty;

  @ApiProperty({ enum: PAYMENT_METHODS, example: "20", description: "Código de forma de pago del SRI." })
  @IsIn(PAYMENT_METHODS, { message: "Elige una forma de pago válida." })
  paymentMethod!: PaymentMethod;
}
