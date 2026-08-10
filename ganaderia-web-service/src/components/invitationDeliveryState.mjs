export const getInvitationDeliveryState = (result = {}) => {
  if (result.emailEnviado) return { kind: "sent" };
  if (result.emailError) return { kind: "email_failed" };
  return { kind: "manual" };
};
