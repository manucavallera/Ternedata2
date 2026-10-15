// Los logs del bot imprimían el cuerpo completo de cada pedido. Si un mensaje trae una contraseña o
// un token (el productor la escribe en el chat), no tiene que quedar en los logs de EasyPanel.
const SECRETOS = /pass(word)?|contrase|token|secret|api[_-]?key|authorization/i;

export const sanearParaLog = (valor: any, profundidad = 0): any => {
  if (valor === null || typeof valor !== 'object' || profundidad > 6) return valor;
  if (Array.isArray(valor)) return valor.map((v) => sanearParaLog(v, profundidad + 1));
  const limpio: Record<string, any> = {};
  for (const [clave, v] of Object.entries(valor)) {
    limpio[clave] = SECRETOS.test(clave) ? '***' : sanearParaLog(v, profundidad + 1);
  }
  return limpio;
};
