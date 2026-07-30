import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateSupervisorGerenteDto,
  UpdateSupervisorGerenteDto,
} from './dto/supervisor-gerente.dto';
import { CreateVendedorDto, UpdateVendedorDto } from './dto/vendedor.dto';

@Injectable()
export class MasterDataService {
  constructor(private readonly database: DatabaseService) {}

  listVendedores() {
    return this.database.query<VendedorRow>(
      `SELECT id_sap_vendedor, codigo_vendedor, nombre_vendedor, email,
              aplica_desc_adicional, codigo_supervisor
       FROM dbo.tbl_Vendedor
       ORDER BY codigo_vendedor`,
    );
  }

  async createVendedor(value: CreateVendedorDto) {
    try {
      await this.database.query(
        `INSERT INTO dbo.tbl_Vendedor
          (id_sap_vendedor, codigo_vendedor, nombre_vendedor, email, aplica_desc_adicional, codigo_supervisor)
         VALUES (@id_sap_vendedor, @codigo_vendedor, @nombre_vendedor, @email, @aplica_desc_adicional, @codigo_supervisor)`,
        { ...value },
      );
    } catch (error) {
      this.handleUniqueViolation(error, 'Ya existe un vendedor con ese ID SAP');
    }
    return { message: 'Vendedor creado correctamente' };
  }

  async updateVendedor(idSapVendedor: string, value: UpdateVendedorDto) {
    const result = await this.database.query<{ affected: number }>(
      `UPDATE dbo.tbl_Vendedor
       SET codigo_vendedor = @codigo_vendedor,
           nombre_vendedor = @nombre_vendedor,
           email = @email,
           aplica_desc_adicional = @aplica_desc_adicional,
           codigo_supervisor = @codigo_supervisor
       WHERE id_sap_vendedor = @idSapVendedor;
       SELECT @@ROWCOUNT AS affected;`,
      { ...value, idSapVendedor },
    );
    this.ensureUpdated(result[0]?.affected, 'Vendedor no encontrado');
    return { message: 'Vendedor actualizado correctamente' };
  }

  listSupervisoresGerentes() {
    return this.database.query<SupervisorGerenteRow>(
      `SELECT codigo_vendedor, email_supervisor, email_gerente, codigo_supervisor,
              codigo_gerente, nombre_supervisor, nombre_gerente
       FROM dbo.tbl_Supervisor_Gerente
       ORDER BY codigo_vendedor`,
    );
  }

  async createSupervisorGerente(value: CreateSupervisorGerenteDto) {
    try {
      await this.database.query(
        `INSERT INTO dbo.tbl_Supervisor_Gerente
          (codigo_vendedor, email_supervisor, email_gerente, codigo_supervisor, codigo_gerente, nombre_supervisor, nombre_gerente)
         VALUES (@codigo_vendedor, @email_supervisor, @email_gerente, @codigo_supervisor, @codigo_gerente, @nombre_supervisor, @nombre_gerente)`,
        { ...value },
      );
    } catch (error) {
      this.handleUniqueViolation(
        error,
        'Ya existe una relación para ese código de vendedor',
      );
    }
    return { message: 'Relación creada correctamente' };
  }

  async updateSupervisorGerente(
    codigoVendedor: string,
    value: UpdateSupervisorGerenteDto,
  ) {
    const result = await this.database.query<{ affected: number }>(
      `UPDATE dbo.tbl_Supervisor_Gerente
       SET email_supervisor = @email_supervisor,
           email_gerente = @email_gerente,
           codigo_supervisor = @codigo_supervisor,
           codigo_gerente = @codigo_gerente,
           nombre_supervisor = @nombre_supervisor,
           nombre_gerente = @nombre_gerente
       WHERE codigo_vendedor = @codigoVendedor;
       SELECT @@ROWCOUNT AS affected;`,
      { ...value, codigoVendedor },
    );
    this.ensureUpdated(result[0]?.affected, 'Relación no encontrada');
    return { message: 'Relación actualizada correctamente' };
  }

  private ensureUpdated(affected: number | undefined, message: string) {
    if (!affected) throw new NotFoundException(message);
  }

  private handleUniqueViolation(error: unknown, message: string): never {
    if (
      (error as { number?: number }).number === 2627 ||
      (error as { number?: number }).number === 2601
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}

export interface VendedorRow {
  id_sap_vendedor: string;
  codigo_vendedor: string;
  nombre_vendedor: string | null;
  email: string | null;
  aplica_desc_adicional: boolean | null;
  codigo_supervisor: string | null;
}

export interface SupervisorGerenteRow {
  codigo_vendedor: string;
  email_supervisor: string | null;
  email_gerente: string | null;
  codigo_supervisor: string | null;
  codigo_gerente: string | null;
  nombre_supervisor: string | null;
  nombre_gerente: string | null;
}
