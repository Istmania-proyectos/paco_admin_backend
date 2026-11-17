import 'reflect-metadata';
import { validate } from 'class-validator';
import { TicketActionDto } from './dto/ticket-action.dto';
import { TicketProductActionItemDto } from './dto/ticket-product-action.dto';
import {
  ApprovalProductResponseDto,
  ApprovalTicketResponseDto,
} from './dto/approval-ticket-response.dto';

describe('Tipos de plan de acción', () => {
  const dtos = [
    TicketActionDto,
    TicketProductActionItemDto,
    ApprovalProductResponseDto,
    ApprovalTicketResponseDto,
  ];

  it.each(dtos)('%p rechaza nuevos planes de reubicación', async (Dto) => {
    const errors = await validate(
      Object.assign(new Dto(), { tipoAccion: 'REUBICACION' }),
    );
    expect(errors.some((error) => error.property === 'tipoAccion')).toBe(true);
  });

  it.each(dtos)('%p permite un plan de descuento', async (Dto) => {
    const errors = await validate(
      Object.assign(new Dto(), { tipoAccion: 'DESCUENTO' }),
    );
    expect(errors.some((error) => error.property === 'tipoAccion')).toBe(false);
  });
});
