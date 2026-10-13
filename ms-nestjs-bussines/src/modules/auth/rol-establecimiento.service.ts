import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type RolEnCampo = 'admin' | 'veterinario' | 'operario';

const NIVEL: Record<RolEnCampo, number> = { operario: 1, veterinario: 2, admin: 3 };

// El rol de un usuario depende del establecimiento: se puede ser dueño de un campo
// y operario en otro. El rol global 'admin' lo recibe cualquiera que se registra,
// así que por sí solo no da permisos sobre un campo ajeno al que fue invitado.
@Injectable()
export class RolEstablecimientoService {
  constructor(private readonly dataSource: DataSource) {}

  async rolEn(user: any, idEstablecimiento: number): Promise<RolEnCampo | null> {
    if (!user || !idEstablecimiento) return null;
    if (user.rol === 'super_admin') return 'admin';

    const fila = await this.membresia(user, idEstablecimiento);
    if (!fila && user.id_establecimiento !== idEstablecimiento) return null;
    if (fila?.rol === 'dueno') return 'admin';

    const rolFila = this.normalizar(fila?.rol);
    if (user.rol === 'admin') {
      // Sin membresía (asignado solo como establecimiento principal desde el panel)
      // o en un campo viejo que no tiene dueño registrado: vale el rol global.
      if (!rolFila || !(await this.tieneDueno(idEstablecimiento))) return 'admin';
      return rolFila;
    }

    // Veterinario y operario globales los asigna un admin: vale el mayor de los dos.
    const rolGlobal = this.normalizar(user.rol);
    if (!rolFila) return rolGlobal;
    if (!rolGlobal) return rolFila;
    return NIVEL[rolFila] >= NIVEL[rolGlobal] ? rolFila : rolGlobal;
  }

  async exigirAdminDe(user: any, idEstablecimiento: number): Promise<void> {
    if ((await this.rolEn(user, idEstablecimiento)) !== 'admin') {
      throw new ForbiddenException('Solo un administrador de este establecimiento puede hacer eso');
    }
  }

  private normalizar(rol?: string | null): RolEnCampo | null {
    return rol === 'veterinario' || rol === 'operario' ? rol : null;
  }

  // El token lista las membresías; si no trae esta (campo creado o invitación
  // aceptada después de emitido) se consulta la base.
  private async membresia(user: any, idEstablecimiento: number): Promise<{ rol?: string } | null> {
    const enToken = (user.userEstablecimientos || []).find(
      (ue: any) => ue.establecimientoId === idEstablecimiento,
    );
    if (enToken) return enToken;
    const filas = await this.dataSource.query(
      'SELECT rol FROM user_establecimientos WHERE "userId" = $1 AND "establecimientoId" = $2 LIMIT 1',
      [user.userId, idEstablecimiento],
    );
    return filas[0] || null;
  }

  private async tieneDueno(idEstablecimiento: number): Promise<boolean> {
    const filas = await this.dataSource.query(
      `SELECT 1 FROM user_establecimientos WHERE "establecimientoId" = $1 AND rol = 'dueno' LIMIT 1`,
      [idEstablecimiento],
    );
    return filas.length > 0;
  }
}
