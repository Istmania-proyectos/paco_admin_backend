import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from './socket';

describe('Socket', () => {
  let provider: Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Socket],
    }).compile();

    provider = module.get<Socket>(Socket);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
