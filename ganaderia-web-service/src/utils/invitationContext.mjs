const AUTH_KEYS = ["token", "NEXT_JS_AUTH", "userSelected"];
const INVITATION_KEYS = [
  "pendingInviteToken",
  "pendingInviteEmail",
  "backupToken",
];

export const captureInvitation = (storage, { token, email }) => {
  if (token) storage.setItem("pendingInviteToken", token);
  if (email) {
    storage.setItem("pendingInviteEmail", email.trim().toLowerCase());
  }
};

export const readInvitation = (storage) => ({
  token:
    storage.getItem("pendingInviteToken") || storage.getItem("backupToken"),
  email: storage.getItem("pendingInviteEmail"),
});

export const clearAuthCredentials = (storage) => {
  AUTH_KEYS.forEach((key) => storage.removeItem(key));
};

export const resolveInvitation = (storage) => {
  INVITATION_KEYS.forEach((key) => storage.removeItem(key));
};
