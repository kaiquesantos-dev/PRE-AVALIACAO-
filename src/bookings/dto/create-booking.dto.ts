import { IsInt, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Id do workspace a ser reservado',
    example: 1,
  })
  @IsInt()
  workspaceId: number;

  @ApiProperty({
    description: 'Data e hora de início da reserva (formato ISO 8601)',
    example: '2026-09-20T14:00:00Z',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    description: 'Data e hora de término da reserva (formato ISO 8601)',
    example: '2026-09-20T16:00:00Z',
  })
  @IsISO8601()
  endAt: string;
}
