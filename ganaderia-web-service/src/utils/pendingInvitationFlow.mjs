import { readInvitation, resolveInvitation } from "./invitationContext.mjs";

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

  const result = await acceptByEmail();
  if (Number(result?.aceptadas) > 0) {
    return { accepted: true, source: "email" };
  }

  return { accepted: false, source: "none" };
};
