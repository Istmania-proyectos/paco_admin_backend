export class MarketResponseDto<T = unknown> {
  success: boolean;
  msg: T;
  error: string;
}
