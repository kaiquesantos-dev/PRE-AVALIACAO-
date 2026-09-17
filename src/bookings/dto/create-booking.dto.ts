import { IsInt, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  workspaceId: number;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;
}
