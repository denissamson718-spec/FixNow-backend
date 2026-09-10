export function getPasswordValidationMessage({
  password,
  confirmPassword,
  fullName,
  email
}: {
  password: string;
  confirmPassword: string;
  fullName: string;
  email: string;
}) {
  const trimmedPassword = password.trim();
  const lowerPassword = trimmedPassword.toLowerCase();
  const lowerName = fullName.trim().toLowerCase();
  const emailName = email.trim().toLowerCase().split("@")[0] ?? "";

  if (!trimmedPassword || !confirmPassword.trim()) {
    return "Please add your password and confirm it.";
  }

  if (trimmedPassword !== confirmPassword.trim()) {
    return "Password and confirm password must match.";
  }

  if (trimmedPassword.length < 10) {
    return "Password must be at least 10 characters long.";
  }

  if (!/[A-Z]/.test(trimmedPassword)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(trimmedPassword)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(trimmedPassword)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(trimmedPassword)) {
    return "Password must include at least one special character.";
  }

  if (lowerName && lowerPassword.includes(lowerName.split(" ")[0] ?? "")) {
    return "Password should not contain your name.";
  }

  if (emailName && lowerPassword.includes(emailName)) {
    return "Password should not contain your email name.";
  }

  return undefined;
}
