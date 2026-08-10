import { readInvitation, resolveInvitation } from "./invitationContext.mjs";

export const getInvitationFailure = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  if (status === 403) {
    return {
      kind: "wrong_account",
      message: message || "Esta invitación pertenece a otra cuenta",
    };
  }
  if (status === 400) {
    return {
      kind: "invalid",
      message: message || "Link inválido, usado o expirado",
    };
  }
  return {
    kind: "temporary",
    message: message || "No se pudo aceptar la invitación",
  };
};

export const completePendingInvitation = async ({
  storage,
  acceptToken,
  acceptByEmail,
}) => {
  const { token } = readInvitation(storage);

  if (token) {
    try {
      await acceptToken(token);
    } catch (error) {
      if (error?.response?.status !== 409) throw error;
    }

    resolveInvitation(storage);
    return { accepted: true, source: "token" };
  }

  let result;
  try {
    result = await acceptByEmail();
  } catch {
    return { accepted: false, source: "none" };
  }
  if (Number(result?.aceptadas) > 0) {
    return { accepted: true, source: "email" };
  }

  return { accepted: false, source: "none" };
};
