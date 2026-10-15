import { Injectable } from '@nestjs/common';

// Los mensajes del bot llegan todos desde Evolution, así que el throttler por IP los cuenta como un
// solo cliente. Este límite es por teléfono: frena a quien dispare Claude en ráfaga (costo) sin
// afectar a los demás productores.
const VENTANA_MS = 60 * 1000;
const MAXIMO = 20;

@Injectable()
export class LimitePorTelefono {
  private porTelefono = new Map<string, number[]>();

  // true si el mensaje entra; false si ese teléfono ya superó el máximo en la ventana.
  permitir(telefono: string, ahora: number = Date.now()): boolean {
    this.limpiar(ahora);
    const recientes = (this.porTelefono.get(telefono) || []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= MAXIMO) {
      this.porTelefono.set(telefono, recientes);
      return false;
    }
    recientes.push(ahora);
    this.porTelefono.set(telefono, recientes);
    return true;
  }

  private limpiar(ahora: number): void {
    for (const [telefono, tiempos] of this.porTelefono) {
      if (!tiempos.some((t) => ahora - t < VENTANA_MS)) this.porTelefono.delete(telefono);
    }
  }
}
