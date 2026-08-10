export const isSuccessfulResponse = (status) =>
  status >= 200 && status < 300;

export const getUserErrorMessage = (response, fallback) => {
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(". ") : message || fallback;
};

export const runConfirmedUserMutation = async ({
  confirmAction,
  confirmationMessage,
  pendingKey,
  request,
  onSuccess,
  successMessage,
  fallbackError,
  feedback,
}) => {
  const { setPendingAction, setError, setNotice } = feedback;
  if (!confirmAction(confirmationMessage)) return false;

  setPendingAction(pendingKey);
  setError("");
  setNotice("");

  try {
    const response = await request();
    if (!isSuccessfulResponse(response.status)) {
      setError(getUserErrorMessage(response, fallbackError));
      return false;
    }

    const completed = await onSuccess(response);
    if (completed === false) return false;
    setNotice(successMessage);
    return true;
  } catch (error) {
    setError(error?.message || fallbackError);
    return false;
  } finally {
    setPendingAction(null);
  }
};
