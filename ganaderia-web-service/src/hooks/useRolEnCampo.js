import { useSelector } from "react-redux";
import { rolEnCampo } from "@/utils/roles";

// Rol del usuario en el campo que está mirando: 'admin' | 'veterinario' | 'operario' | null.
export const useRolEnCampo = () => {
  const { userPayload, establecimientoActual, misEstablecimientos } = useSelector(
    (state) => state.auth
  );
  return rolEnCampo(
    userPayload,
    establecimientoActual ?? userPayload?.id_establecimiento,
    misEstablecimientos
  );
};
